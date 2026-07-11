import { renderBodyHtml, renderBodyText, ProseMirrorNode } from './render-body.util';

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
});
