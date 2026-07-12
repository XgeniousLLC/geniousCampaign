const HREF_RE = /<a\s+href="([^"]*)"/gi;

/** Rewrites every <a href="..."> in resolved HTML to a signed click-tracking
 * URL that redirects back to the original target (GC-019). */
export function rewriteLinksForTracking(html: string, buildClickUrl: (originalUrl: string) => string): string {
  return html.replace(HREF_RE, (match, url: string) => {
    if (!url || url.startsWith('mailto:') || url.startsWith('#')) return match;
    return `<a href="${buildClickUrl(url)}"`;
  });
}
