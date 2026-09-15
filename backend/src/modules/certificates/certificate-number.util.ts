export function nextCertificateNumber(
  prefix: string,
  year: number,
  lastNumber?: string | null,
): string {
  let sequence = 1;
  if (lastNumber) {
    const parts = lastNumber.split('-');
    sequence = parseInt(parts[2] || '0', 10) + 1;
  }
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

export function generateVerificationCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
