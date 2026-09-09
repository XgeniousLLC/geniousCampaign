const HREF_RE = /<a\s+href="([^"]*)"/gi;

/** Inverse of render-body.ts's escapeHtml() — a link URL typed with a literal
 * `&` (e.g. `?a=1&b=2`) is HTML-escaped to `&amp;` when the template body is
 * rendered, since that's required for a well-formed `href="..."` attribute.
 * The regex extraction above pulls that attribute text back out verbatim, so
 * without this decode the `&amp;` text gets baked into the signed click-token
 * payload and comes back out literally in the redirect URL instead of `&`. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/** Rewrites every <a href="..."> in resolved HTML to a signed click-tracking
 * URL that redirects back to the original target (GC-019). */
export function rewriteLinksForTracking(html: string, buildClickUrl: (originalUrl: string) => string): string {
  return html.replace(HREF_RE, (match, url: string) => {
    if (!url || url.startsWith('mailto:') || url.startsWith('#')) return match;
    return `<a href="${buildClickUrl(decodeHtmlEntities(url))}"`;
  });
}
