import { renderBodyHtml, renderBodyText, type ProseMirrorNode } from '@genius-campaign/shared';

describe('renderBodyHtml / renderBodyText', () => {
  it('renders personalizationToken nodes as {{field}}, not empty', () => {
    const doc: ProseMirrorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'personalizationToken', attrs: { field: 'contact.firstName', label: 'First name' } },
          ],
        },
      ],
    };

    expect(renderBodyHtml(doc)).toContain('{{contact.firstName}}');
    expect(renderBodyText(doc)).toBe('Hi {{contact.firstName}}');
  });

  it('renders spintaxBlock nodes as raw brace syntax', () => {
    const doc: ProseMirrorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hey ' },
            { type: 'spintaxBlock', attrs: { options: ['there', 'friend'] } },
          ],
        },
      ],
    };

    expect(renderBodyText(doc)).toBe('Hey {there|friend}');
  });

  // Email clients (Gmail especially) reset <p> margins in the message body —
  // without a carried inline style, paragraphs that look separated in the
  // editor arrive as one flush block.
  it('carries paragraph spacing as an inline style', () => {
    const doc: ProseMirrorNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    };

    const html = renderBodyHtml(doc);
    expect(html).toBe(
      '<p style="margin:0 0 16px">First</p><p style="margin:0 0 16px">Second</p>',
    );
  });

  it('keeps an intentionally blank paragraph as a line instead of dropping it', () => {
    const doc: ProseMirrorNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Above' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Below' }] },
      ],
    };

    expect(renderBodyHtml(doc)).toContain(
      '<p style="margin:0 0 16px">&nbsp;</p>',
    );
    // The plain-text alternative already gets its blank line from the join.
    expect(renderBodyText(doc)).toBe('Above\n\nBelow');
  });

  it('combines text alignment with the paragraph spacing style', () => {
    const doc: ProseMirrorNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [{ type: 'text', text: 'Centered' }],
        },
      ],
    };

    expect(renderBodyHtml(doc)).toBe(
      '<p style="margin:0 0 16px;text-align:center">Centered</p>',
    );
  });
});
