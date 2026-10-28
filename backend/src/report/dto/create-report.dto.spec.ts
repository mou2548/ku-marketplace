import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

const body = (details?: unknown) => ({
  report_type: 'User',
  target_id: 9,
  reason_category: 'Scam',
  ...(details === undefined ? {} : { details }),
});

async function problems(details?: unknown) {
  const dto = plainToInstance(CreateReportDto, body(details));
  const errors = await validate(dto);
  return { dto, fields: errors.map((e) => e.property) };
}

describe('CreateReportDto details', () => {
  it('rejects a report with no details', async () => {
    expect((await problems()).fields).toContain('details');
  });

  it('rejects details under 10 characters', async () => {
    expect((await problems('too short')).fields).toContain('details');
  });

  it('counts the text once trimmed, so padding does not help', async () => {
    expect((await problems('   short    ')).fields).toContain('details');
    expect((await problems(' '.repeat(40))).fields).toContain('details');
  });

  it('rejects details that are not text', async () => {
    expect((await problems(1234567890)).fields).toContain('details');
  });

  it('accepts 10 characters and hands the service the trimmed text', async () => {
    const { dto, fields } = await problems('  0123456789  ');
    expect(fields).toEqual([]);
    expect(dto.details).toBe('0123456789');
  });

  it('still caps details at 2000 characters', async () => {
    expect((await problems('x'.repeat(2001))).fields).toContain('details');
    expect((await problems('x'.repeat(2000))).fields).toEqual([]);
  });
});
