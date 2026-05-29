export function normalizeIco(ico: string): string {
  return ico.trim().padStart(8, '0');
}

export function validateIco(ico: string): boolean {
  const normalized = normalizeIco(ico);
  if (!/^\d{8}$/.test(normalized)) return false;

  const digits = normalized.split('').map(Number);
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;

  let expectedChecksum: number;
  if (remainder === 0) expectedChecksum = 1;
  else if (remainder === 1) expectedChecksum = 0;
  else expectedChecksum = 11 - remainder;

  return digits[7] === expectedChecksum;
}
