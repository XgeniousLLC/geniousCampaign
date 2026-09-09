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

  it('decodes &amp; back to & before handing the URL to buildClickUrl', () => {
    // render-body.ts's escapeHtml() turns a literal `&` into `&amp;` when the
    // template body is rendered to HTML, since that's required for a
    // well-formed href attribute — the regex extraction above pulls that
    // escaped text back out verbatim, so it must be decoded here.
    const html = '<a href="https://taskip.net/checkout?source=offer&amp;planId=agency-pro&amp;installment=true">Buy</a>';
    let capturedUrl = '';
    rewriteLinksForTracking(html, (url) => {
      capturedUrl = url;
      return 'https://track.test/t/c/token';
    });
    expect(capturedUrl).toBe('https://taskip.net/checkout?source=offer&planId=agency-pro&installment=true');
  });
});
