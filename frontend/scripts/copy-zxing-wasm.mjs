// Copies the QR decoder's .wasm into public/ so the scanner serves it from
// this app instead of the jsDelivr default (components/kit/qr-scanner.tsx).
// The version is in the file name, so an upgrade never reuses a cached binary.
// Runs after install and before build; public/zxing/ is git-ignored.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
// package.json is not an exported subpath; it sits two levels above dist/reader.
const { version } = JSON.parse(
  readFileSync(join(dirname(source), "../../package.json"), "utf8"),
);
const target = new URL(`../public/zxing/zxing_reader-${version}.wasm`, import.meta.url);

mkdirSync(new URL("../public/zxing/", import.meta.url), { recursive: true });
copyFileSync(source, target);
console.log(`zxing_reader-${version}.wasm copied to public/zxing/`);
