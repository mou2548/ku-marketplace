/**
 * §envelope — escape hatch for the rare route whose success `message` is
 * genuinely dynamic (depends on the result, e.g. "QR ถูกต้อง" vs "QR ไม่ถูกต้อง"),
 * so a static @ResponseMessage(...) decorator can't express it.
 *
 * Return `new MessageOverride(message, data)` from a service method and
 * ResponseInterceptor will use `message` instead of the decorator's default,
 * while still producing the single flat { success, message, data } shape —
 * this is NOT a general-purpose envelope helper, don't reach for it unless
 * @ResponseMessage genuinely can't express the message statically.
 */
export class MessageOverride<T> {
  constructor(
    public message: string,
    public data: T,
  ) {}
}
