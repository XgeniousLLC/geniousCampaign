import { appendToHtmlBody } from '@genius-campaign/shared';

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Campaigns are bulk mail, so every message needs a visible opt-out link in
 * the body in addition to the List-Unsubscribe header. Applied after
 * click-tracking rewrite and the open pixel, so the link can never be
 * wrapped in a tracking redirect.
 *
 * A `#` URL is the "tracking secret not configured" fallback — there is
 * nothing useful to link to, so the body is returned untouched.
 */
export function appendCampaignUnsubscribeFooter(
  html: string,
  text: string,
  unsubscribeUrl: string,
): { html: string; text: string } {
  if (!unsubscribeUrl || unsubscribeUrl === '#') {
    return { html, text };
  }

  const href = escapeHtmlAttribute(unsubscribeUrl);
  return {
    html: appendToHtmlBody(
      html,
      `<p style="margin-top:24px;font-size:12px;line-height:1.5;color:#6b7280;text-align:center">You are receiving this email because you subscribed. <a href="${href}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a></p>`,
    ),
    text: `${text}\n\n---\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
