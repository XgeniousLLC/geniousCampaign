import { appendCampaignUnsubscribeFooter } from './campaign-unsubscribe-footer.util';

describe('appendCampaignUnsubscribeFooter', () => {
  const url = 'https://api.example.com/unsubscribe/abc.def';

  it('appends a visible footer link before </body> for a full HTML document', () => {
    const result = appendCampaignUnsubscribeFooter(
      '<html><body><p>Hi</p></body></html>',
      'Hi',
      url,
    );

    expect(result.html).toContain('<p>Hi</p>');
    expect(result.html).toContain(`<a href="${url}"`);
    expect(result.html).toContain('Unsubscribe</a>');
    expect(result.html.indexOf('Unsubscribe')).toBeLessThan(
      result.html.indexOf('</body>'),
    );
    expect(result.text).toBe(`Hi\n\n---\nUnsubscribe: ${url}`);
  });

  it('appends to a plain HTML fragment when there is no <body>', () => {
    const result = appendCampaignUnsubscribeFooter('<p>Hi</p>', 'Hi', url);
    expect(result.html.startsWith('<p>Hi</p>')).toBe(true);
    expect(result.html).toContain('Unsubscribe</a>');
  });

  it('leaves the body untouched when no unsubscribe URL is configured', () => {
    expect(appendCampaignUnsubscribeFooter('<p>Hi</p>', 'Hi', '#')).toEqual({
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });

  it('escapes the URL when it is embedded in an href attribute', () => {
    const result = appendCampaignUnsubscribeFooter(
      '<p>Hi</p>',
      'Hi',
      'https://x.test/u?a=1&b=2',
    );
    expect(result.html).toContain('a=1&amp;b=2');
  });
});
