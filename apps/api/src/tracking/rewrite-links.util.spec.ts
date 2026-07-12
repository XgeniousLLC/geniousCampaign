import { rewriteLinksForTracking } from './rewrite-links.util';

describe('rewriteLinksForTracking', () => {
  it('rewrites href attributes to tracking URLs', () => {
    const html = '<p>Hello <a href="https://example.com/a">A</a> and <a href="https://example.com/b">B</a></p>';
    const result = rewriteLinksForTracking(html, (url) => `https://track.test/t/c/${encodeURIComponent(url)}`);
    expect(result).toContain('href="https://track.test/t/c/https%3A%2F%2Fexample.com%2Fa"');
    expect(result).toContain('href="https://track.test/t/c/https%3A%2F%2Fexample.com%2Fb"');
  });

  it('leaves mailto: and anchor links untouched', () => {
    const html = '<a href="mailto:x@example.com">Email</a><a href="#section">Jump</a>';
    const result = rewriteLinksForTracking(html, () => 'SHOULD_NOT_APPEAR');
    expect(result).not.toContain('SHOULD_NOT_APPEAR');
  });
});
