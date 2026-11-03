import {
  renderInvalidUnsubscribePage,
  renderUnsubscribePage,
} from './unsubscribe-page.util';

describe('renderUnsubscribePage', () => {
  const token = 'payload.signature';

  it('renders all three steps and the confirm endpoint', () => {
    const html = renderUnsubscribePage(token, 'jane@example.com');

    expect(html).toContain('STEP 1 OF 3');
    expect(html).toContain('STEP 2 OF 3');
    expect(html).toContain('STEP 3 OF 3');
    expect(html).toContain('jane@example.com');
    expect(html).toContain('/confirm');
  });

  it('masks the address on the first screen', () => {
    const html = renderUnsubscribePage(token, 'jane@example.com');
    expect(html).toContain('ja**@example.com');
  });

  it('escapes the email in HTML and in the inline script', () => {
    const html = renderUnsubscribePage(
      token,
      'x"><script>alert(1)</script>@example.com',
    );
    expect(html).not.toContain('<script>alert(1)</script>@example.com');
    expect(html).toContain('\\u003cscript\\u003e');
  });
});

describe('renderInvalidUnsubscribePage', () => {
  it('returns a helpful invalid-link message', () => {
    const html = renderInvalidUnsubscribePage();
    expect(html).toContain("couldn't process that link");
    expect(html).toContain('invalid or has expired');
  });
});
