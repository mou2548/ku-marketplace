import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService local setup', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('supports registration and password reset without an email API key locally', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'development';
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new MailService();
    await expect(
      service.sendOtp('demo@ku.th', '123456'),
    ).resolves.toBeUndefined();
    await expect(
      service.sendPasswordResetOtp('demo@ku.th', '654321'),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('654321'));
  });

  it('requires real email configuration in production', () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'production';
    expect(() => new MailService()).toThrow('RESEND_API_KEY is required');
  });
});
