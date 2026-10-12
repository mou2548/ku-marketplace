import {
  maskPromptPayId,
  normalizePromptPayId,
  promptPayPayload,
} from './promptpay';

describe('PromptPay ID', () => {
  it('accepts a Thai mobile number, with or without separators', () => {
    expect(normalizePromptPayId('0812345678')).toBe('0812345678');
    expect(normalizePromptPayId('081-234-5678')).toBe('0812345678');
    expect(normalizePromptPayId(' 061 234 5678 ')).toBe('0612345678');
  });

  it.each([
    ['a national ID', '1234567890123'],
    ['a landline', '021234567'],
    ['an international form', '+66812345678'],
    ['too few digits', '081234567'],
    ['letters', '08123x5678'],
    ['nothing', ''],
  ])('refuses %s', (_case, input) => {
    expect(normalizePromptPayId(input)).toBeNull();
  });

  it('masks all but the last four digits', () => {
    expect(maskPromptPayId('0812345678')).toBe('xxx-xxx-5678');
  });
});

describe('promptPayPayload', () => {
  // Both strings were checked character for character against the output of
  // promptpay-qr@0.5.0, the reference implementation most Thai apps use.
  it('builds the same payload as the reference implementation', () => {
    expect(promptPayPayload('0812345678', 100)).toBe(
      '00020101021229370016A000000677010111011300668123456785802TH53037645406100.006304BB8A',
    );
    expect(promptPayPayload('0612345678', 4.22)).toBe(
      '00020101021229370016A000000677010111011300666123456785802TH530376454044.2263048458',
    );
  });

  it('carries the account, the currency and the exact amount', () => {
    const payload = promptPayPayload('0998887777', 13500);
    expect(payload).toContain('0016A000000677010111');
    expect(payload).toContain('01130066998887777');
    expect(payload).toContain('5303764');
    expect(payload).toContain('540813500.00');
    // One-off code with its own amount, not a reusable static one.
    expect(payload.startsWith('000201010212')).toBe(true);
  });

  it('refuses anything it could not build a payable code from', () => {
    expect(() => promptPayPayload('081-234-5678', 100)).toThrow();
    expect(() => promptPayPayload('0812345678', 0)).toThrow();
    expect(() => promptPayPayload('0812345678', Number.NaN)).toThrow();
  });
});
