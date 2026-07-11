import { resolveSpintax } from '@genius-campaign/shared';

describe('resolveSpintax', () => {
  it('resolves plain text unchanged', () => {
    expect(resolveSpintax('Hello world')).toBe('Hello world');
  });

  it('picks one option from a flat group', () => {
    const result = resolveSpintax('{A|B|C}');
    expect(['A', 'B', 'C']).toContain(result);
  });

  it('resolves nested groups', () => {
    const result = resolveSpintax('{Hi|Hello {there|friend}}');
    expect(['Hi', 'Hello there', 'Hello friend']).toContain(result);
  });

  it('resolves multiple groups in one string', () => {
    const result = resolveSpintax('{Hi|Hello} {there|friend}!');
    const [greeting, rest] = [result.split(' ')[0], result.split(' ').slice(1).join(' ')];
    expect(['Hi', 'Hello']).toContain(greeting);
    expect(['there!', 'friend!']).toContain(rest);
  });

  it('produces a reasonable spread across options over 20 resolutions', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(resolveSpintax('{Alpha|Beta|Gamma|Delta}'));
    }
    // With 20 draws from 4 uniformly-random options, seeing only 1 distinct
    // value would be a ~4^-19 chance — this is a real spread check, not a tautology.
    expect(seen.size).toBeGreaterThan(1);
  });
});
