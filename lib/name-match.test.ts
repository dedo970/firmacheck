import { describe, it, expect } from 'vitest';
import { matchNames } from './name-match';

describe('matchNames', () => {
  it('returns exact for identical names', () => {
    expect(matchNames('ideabox s.r.o.', 'ideabox s.r.o.')).toBe('exact');
  });
  it('returns exact ignoring case', () => {
    expect(matchNames('Ideabox', 'IDEABOX S.R.O.')).toBe('exact');
  });
  it('returns partial when input is substring of ARES name', () => {
    expect(matchNames('ideabox', 'ideabox s.r.o.')).toBe('partial');
  });
  it('returns partial when ARES name contains input word', () => {
    expect(matchNames('novak', 'Novák a synové s.r.o.')).toBe('partial');
  });
  it('returns none for completely different names', () => {
    expect(matchNames('coca cola', 'ideabox s.r.o.')).toBe('none');
  });
  it('returns exact when empty input (no name provided)', () => {
    expect(matchNames('', 'anything')).toBe('exact');
  });
});
