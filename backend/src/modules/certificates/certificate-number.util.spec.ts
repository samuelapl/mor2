import { generateVerificationCode, nextCertificateNumber } from './certificate-number.util';

describe('nextCertificateNumber', () => {
  it('sequences from scratch', () => {
    expect(nextCertificateNumber('ELTMS', 2026, null)).toBe('ELTMS-2026-000001');
  });

  it('increments the last certificate number', () => {
    expect(nextCertificateNumber('ELTMS', 2026, 'ELTMS-2026-000041')).toBe('ELTMS-2026-000042');
  });

  it('handles numbers from previous years', () => {
    expect(nextCertificateNumber('ELTMS', 2026, 'ELTMS-2025-000050')).toBe('ELTMS-2026-000051');
  });
});

describe('generateVerificationCode', () => {
  it('produces codes of the requested length', () => {
    expect(generateVerificationCode(8)).toHaveLength(8);
  });

  it('produces only alphanumeric characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateVerificationCode(8);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    }
  });
});
