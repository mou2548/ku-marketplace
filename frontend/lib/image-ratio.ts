import { isAllowedImageUrl } from "./image-hosts";
import { cardRatio, HEADER_BYTES, readImageSize, type ImageSize } from "./image-size";

/**
 * Server side: each photo's card ratio, read from the first bytes of the file.
 *
 * Only allowed hosts are read, redirects are refused (a redirect could point
 * anywhere), and at most `HEADER_BYTES` are read. Image URLs never change
 * content, so a size that was read is remembered for the life of the process.
 * A failure (timeout, redirect, 429, 5xx) is remembered for `RETRY_MS` only,
 * so a bad host costs one attempt per few minutes, not one per page view.
 *
 * The page never waits on a slow host: `cardRatios` gives up after
 * `BUDGET_MS` and uses the fallback ratio for whatever is still loading,
 * while those reads finish in the background and fill the cache for the next
 * request. At most `CONCURRENCY` reads run at once.
 */

const TIMEOUT_MS = 1500;
const BUDGET_MS = 600;
const RETRY_MS = 5 * 60 * 1000;
const CONCURRENCY = 8;
const MAX_CACHED = 20_000;

type Entry = { size: ImageSize | null; retryAt: number | null };

const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<ImageSize | null>>();

let running = 0;
const queue: Array<() => void> = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= CONCURRENCY) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  running++;
  try {
    return await task();
  } finally {
    running--;
    queue.shift()?.();
  }
}

async function fetchHeader(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${HEADER_BYTES - 1}` },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  // A host that ignores Range sends the whole file; stop reading once there
  // is enough for the header.
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < HEADER_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
  }
  await reader.cancel().catch(() => {});

  const bytes = new Uint8Array(Math.min(length, HEADER_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.length;
    if (offset >= bytes.length) break;
  }
  return bytes;
}

function remember(url: string, entry: Entry) {
  if (!cache.has(url) && cache.size >= MAX_CACHED) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(url, entry);
}

function imageSize(url: string): Promise<ImageSize | null> {
  const known = cache.get(url);
  if (known && (known.retryAt === null || known.retryAt > Date.now())) {
    return Promise.resolve(known.size);
  }
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;

  const work = limited(async () => {
    try {
      // Read and parsed, or read and not an image format we know: either
      // way the answer will not change.
      const size = readImageSize(await fetchHeader(url));
      remember(url, { size, retryAt: null });
      return size;
    } catch {
      remember(url, { size: null, retryAt: Date.now() + RETRY_MS });
      return null;
    } finally {
      pending.delete(url);
    }
  });
  pending.set(url, work);
  return work;
}

/** Card ratio per URL. Missing, disallowed or still-loading URLs get the fallback. */
export async function cardRatios(
  urls: Array<string | null | undefined>,
): Promise<number[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), BUDGET_MS);
  });
  try {
    return await Promise.all(
      urls.map(async (url) =>
        url && isAllowedImageUrl(url)
          ? cardRatio(await Promise.race([imageSize(url), budget]))
          : cardRatio(null),
      ),
    );
  } finally {
    clearTimeout(timer);
  }
}
