import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import {
  appendToHtmlBody,
  renderBodyHtml,
  renderBodyText,
  resolveTemplateContent,
  type EmailStudioBody,
} from '@genius-campaign/shared';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';

// Runs the real email-studio editor script (apps/web/public/email-studio) under
// a do-nothing DOM stub so we can compile every gallery design to HTML exactly
// as the editor does, then push it through the send pipeline.
interface Studio {
  GALLERY: { name: string; keys: string[] }[];
  galDoc: (g: unknown) => Record<string, unknown>;
  htmlOf: (d: unknown) => string;
}

function loadStudio(): Studio {
  const page = readFileSync(
    resolve(__dirname, '../../../web/src/studio/email-studio.html'),
    'utf8',
  );
  const script = page.slice(
    page.lastIndexOf('<script>') + 8,
    page.lastIndexOf('</script>'),
  );
  const stub: unknown = new Proxy(function () {}, {
    get: (_t, k) => (k === Symbol.toPrimitive ? () => '' : stub),
    apply: () => stub,
    set: () => true,
  });
  const g: Record<string, unknown> = {
    document: stub,
    window: stub,
    location: { origin: '' },
    console,
  };
  // Expose the pieces we need from inside the editor's closure.
  const patched = script.replace(
    /renderAll\(\);commit\(\);\s*toParent\(\{type:'ready'\}\);/,
    'globalThis.__studio={GALLERY,galDoc,htmlOf};',
  );
  expect(patched).not.toBe(script);
  runInNewContext(patched, g);
  return g.__studio as Studio;
}

const CONTACT = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

describe('email-studio designs through the send pipeline', () => {
  const studio = loadStudio();
  const designs = studio.GALLERY.filter((g) => g.keys.length > 0);

  it('has the gallery designs', () => {
    expect(designs.length).toBeGreaterThanOrEqual(11);
  });

  it.each(designs.map((d) => [d.name, d] as const))(
    '%s is sent exactly as designed',
    (_n, design) => {
      const html = studio.htmlOf(studio.galDoc(design));
      const body: EmailStudioBody = {
        type: 'email-studio',
        doc: studio.galDoc(design),
        html,
      };

      // Saved body renders to the editor's HTML untouched.
      const stored = renderBodyHtml(body);
      expect(stored).toBe(html);
      expect(renderBodyText(body).length).toBeGreaterThan(20);

      // Send-time resolution: conditionals -> personalization -> spintax.
      const sent = resolveTemplateContent(
        {
          subjectLines: ['Hi'],
          previewTextLines: [],
          bodyHtml: stored,
          bodyText: '',
        },
        CONTACT,
      ).bodyHtml;

      // Responsive CSS survives (spintax would otherwise strip its braces).
      const style = stored.match(/<style>[\s\S]*?<\/style>/)?.[0];
      expect(style).toContain('@media (max-width:620px){.stack{');
      expect(sent).toContain(style as string);

      // Only personalization tokens may differ.
      expect(sent).not.toMatch(/\{\{/);
      const expected = stored.replace(
        /\{\{contact\.firstName\|there\}\}/g,
        'Ada',
      );
      expect(sent).toBe(expected);

      // Click tracking rewrites links but keeps the markup otherwise intact.
      const links = (sent.match(/<a href="(?!#|mailto:)[^"]+"/g) ?? []).length;
      let rewritten = 0;
      const tracked = rewriteLinksForTracking(sent, (u) => {
        rewritten++;
        return `https://t.example/c/${encodeURIComponent(u)}`;
      });
      expect(rewritten).toBe(links);
      expect(tracked.replace(/<a href="[^"]*"/g, '<a href=""')).toBe(
        sent.replace(/<a href="[^"]*"/g, '<a href=""'),
      );
      expect((tracked.match(/<table/g) ?? []).length).toBe(
        (stored.match(/<table/g) ?? []).length,
      );
    },
  );

  it('greets the contact by first name in the welcome design', () => {
    const welcome = designs.find((d) => d.name === 'Welcome')!;
    const html = studio.htmlOf(studio.galDoc(welcome));
    const sent = resolveTemplateContent(
      {
        subjectLines: ['x'],
        previewTextLines: [],
        bodyHtml: html,
        bodyText: '',
      },
      { ...CONTACT, firstName: null },
    ).bodyHtml;
    expect(sent).toContain('Welcome, <span style="color:#f04a23">there</span>');
  });

  // Rules of thumb for Gmail and Outlook desktop (Word engine): no SVG,
  // padding only on table cells, buttons built from a table cell.
  it.each(designs.map((d) => [d.name, d] as const))(
    '%s avoids constructs Gmail/Outlook drop',
    (_n, design) => {
      const html = studio.htmlOf(studio.galDoc(design));
      expect(html).not.toMatch(/<svg/i);
      expect(html).not.toMatch(/<div[^>]*padding:/i);
      expect(html).not.toMatch(/<(p|h[1-6])[^>]*margin:[1-9]/i);
      expect(html).toMatch(/^<!DOCTYPE html>/);
      for (const a of html.match(/<a [^>]*>/g) ?? []) {
        expect(a).toMatch(/^<a href=/); // click-tracking rewrite only matches href-first anchors
      }
      // Every button anchor sits in a coloured table cell.
      const buttons =
        html.match(/text-decoration:none;display:inline-block">/g) ?? [];
      const cells =
        html.match(/<td align="center" bgcolor="[^"]+"[^>]*><a href=/g) ?? [];
      expect(cells).toHaveLength(buttons.length);
    },
  );

  it('puts the tracking pixel and unsubscribe footer inside <body>, after the design', () => {
    const html = studio.htmlOf(studio.galDoc(designs[0]));
    const withPixel = appendToHtmlBody(html, '<img src="PIXEL">');
    const withFooter = appendToHtmlBody(withPixel, '<p>UNSUB</p>');
    const tail = withFooter.slice(withFooter.indexOf('<img src="PIXEL">'));
    expect(tail).toBe('<img src="PIXEL"><p>UNSUB</p></body>\n</html>');
    expect(withFooter.indexOf('</table>')).toBeLessThan(
      withFooter.indexOf('PIXEL'),
    );
    expect(withFooter.match(/<\/html>/g)).toHaveLength(1);
    // Plain (TipTap) fragments keep the old append behaviour.
    expect(appendToHtmlBody('<p>Hi</p>', '<p>UNSUB</p>')).toBe(
      '<p>Hi</p><p>UNSUB</p>',
    );
  });
});
