import { randomBytes, randomInt } from 'crypto';

export function generateEntryNumber(digits = 5) {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, '0');
}

export function generateFolio(quarter: string, entryNumber: string) {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${quarter}-${entryNumber}-${suffix}`;
}
