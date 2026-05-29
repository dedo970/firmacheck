import { describe, it, expect } from 'vitest';
import { validateIco, normalizeIco } from './validate-ico';

describe('normalizeIco', () => {
  it('left-pads short IČO with zeros', () => {
    expect(normalizeIco('1234567')).toBe('01234567');
  });
  it('leaves 8-digit IČO unchanged', () => {
    expect(normalizeIco('02823519')).toBe('02823519');
  });
});

describe('validateIco', () => {
  it('accepts valid IČO 02823519', () => {
    expect(validateIco('02823519')).toBe(true);
  });
  it('accepts valid IČO with leading zero padding', () => {
    expect(validateIco('2823519')).toBe(true);
  });
  it('rejects non-numeric input', () => {
    expect(validateIco('abcd1234')).toBe(false);
  });
  it('rejects IČO longer than 8 digits', () => {
    expect(validateIco('123456789')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateIco('')).toBe(false);
  });
  it('rejects IČO with invalid checksum', () => {
    expect(validateIco('12345678')).toBe(false);
  });
});
