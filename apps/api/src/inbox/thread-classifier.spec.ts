import {
  classifyReply,
  replyRequestsUnsubscribe,
  unsubKeywordsFrom,
} from './thread-classifier.util';

describe('thread-classifier', () => {
  const cases: Array<[string, string, string, string]> = [
    [
      'ooo header',
      'Re: hello',
      'Auto-Submitted: auto-replied',
      'out_of_office',
    ],
    ['ooo subject', 'Automatic reply: OOO', '', 'out_of_office'],
    [
      'ooo body',
      'Re:',
      'I am currently out of office, back Monday',
      'out_of_office',
    ],
    [
      'not interested',
      'Re:',
      'Not interested. Thanks. Have a great day.',
      'not_interested',
    ],
    ['remove me', 'Re:', 'Please remove me from your list', 'not_interested'],
    ['stop emailing', 'Re:', 'Stop emailing me', 'not_interested'],
    [
      'meeting',
      'Re:',
      "Let's meet Tuesday at 3pm, calendly link?",
      'meeting_booked',
    ],
    [
      'available',
      'Re:',
      'I am available on Thursday morning, works for me',
      'meeting_booked',
    ],
    ['interested', 'Re:', 'Interested, send me pricing please', 'interested'],
    ['quote', 'Re:', 'Can you send a quote?', 'interested'],
    ['tell me more', 'Re:', 'Tell me more about the integration', 'interested'],
    ['closed', 'Re:', 'Invoice paid, deal closed', 'closed'],
    ['uncategorized', 'Re:', 'Hi, thanks for reaching out', 'uncategorized'],
    [
      'quoted stripped',
      'Re:',
      '> old text\nSounds great, send proposal',
      'interested',
    ],
    [
      'on wrote stripped',
      'Re:',
      'Yes interested\nOn Mon, X wrote: old',
      'interested',
    ],
    ['no need', 'Re:', 'We have no need right now', 'not_interested'],
    ['pass', 'Re:', 'We will pass on this', 'not_interested'],
    ['schedule call', 'Re:', 'Schedule our call for Friday', 'meeting_booked'],
    ['cost', 'Re:', 'What is the cost?', 'interested'],
    ['deck', 'Re:', 'Send me the deck', 'interested'],
    ['parental', 'Re:', 'I am on parental leave until June', 'out_of_office'],
  ];
  it.each(cases)('%s classifies as %s', (_name, subject, body, expected) => {
    const headers: Record<string, string> = {};
    if (body.startsWith('Auto-Submitted')) {
      headers['Auto-Submitted'] = 'auto-replied';
    }
    const text = body.startsWith('Auto-Submitted') ? 'thanks' : body;
    expect(classifyReply({ subject, headers, bodyText: text }).status).toBe(
      expected,
    );
  });
});

describe('unsubscribe reply detection', () => {
  it('defaults keywords to ["stop"]', () => {
    expect(unsubKeywordsFrom(null)).toEqual(['stop']);
    expect(unsubKeywordsFrom('')).toEqual(['stop']);
    expect(unsubKeywordsFrom('Stop, Unsubscribe\nremove me')).toEqual([
      'stop',
      'unsubscribe',
      'remove me',
    ]);
  });

  const keywords = ['stop'];
  it.each([
    'Stop',
    'stop.',
    'STOP!',
    'Please stop',
    'Stop, thanks',
    'Stop\n> quoted reply text',
    "I'd prefer you stop",
  ])('matches a short opt-out reply: %j', (body) => {
    expect(replyRequestsUnsubscribe(body, keywords)).toBe(true);
  });

  it.each([
    '',
    'Thanks, this is great',
    "I can't stop thinking about how useful this could be for our team next quarter",
  ])('does not match non-opt-out mail: %j', (body) => {
    expect(replyRequestsUnsubscribe(body, keywords)).toBe(false);
  });

  it('matches multi-word custom keywords as a phrase', () => {
    expect(replyRequestsUnsubscribe('please remove me', ['remove me'])).toBe(
      true,
    );
    expect(replyRequestsUnsubscribe('me remove please', ['remove me'])).toBe(
      false,
    );
  });
});
