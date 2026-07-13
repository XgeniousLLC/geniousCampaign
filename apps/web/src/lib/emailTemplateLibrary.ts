// Prebuilt starter templates, rebuilt from the "Email Library" Claude Design
// project (plain-style founder/SaaS lifecycle emails) using this editor's own
// node vocabulary (paragraphs, lists, the CtaButton node, personalization
// tokens) rather than the source's raw HTML-table markup — this app stores
// templates as ProseMirror JSON (bodyJson), not raw HTML, so a prebuilt
// template is a starting doc to customize, not a pixel copy of the source.

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Mark[];
  content?: Node[];
}

export interface LibraryTemplate {
  slug: string;
  name: string;
  desc: string;
  subject: string;
  bodyJson: { type: 'doc'; content: Node[] };
}

const text = (t: string, marks?: Mark[]): Node => (marks ? { type: 'text', text: t, marks } : { type: 'text', text: t });
const bold = (t: string): Node => text(t, [{ type: 'bold' }]);
const link = (t: string, href: string): Node => text(t, [{ type: 'link', attrs: { href } }]);
const p = (...content: Node[]): Node => ({ type: 'paragraph', content });
const firstName: Node = { type: 'personalizationToken', attrs: { field: 'contact.firstName', label: 'First name' } };
const button = (buttonText: string, href = '#'): Node => ({ type: 'ctaButton', attrs: { text: buttonText, href } });
const signature = (): Node => p(text('Ryan'), { type: 'hardBreak' }, text('Founder, Orbit'));
const orderedItem = (leadIn: string, rest: string): Node => ({
  type: 'listItem',
  content: [p(bold(leadIn), text(' ' + rest))],
});
const bulletItem = (t: string): Node => ({ type: 'listItem', content: [p(text(t))] });

export const EMAIL_TEMPLATE_LIBRARY: LibraryTemplate[] = [
  {
    slug: 'plain-01-founder-welcome',
    name: 'Founder welcome',
    desc: 'Personal note from the founder',
    subject: 'Welcome to Orbit',
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hey '), firstName, text(',')),
        p(
          text(
            'Ryan here — I started Orbit because I was tired of my whole team living in status meetings. So first off: thank you for giving it a shot. It genuinely means a lot.',
          ),
        ),
        p(
          text(
            "I don't want to send you a huge onboarding flow. Just one thing to try today: create a single project and drag two tasks onto the board. That's the moment it usually clicks.",
          ),
        ),
        p(
          text(
            'And a quick question — what made you sign up? Just hit reply and tell me. I read every one, and it shapes what we build next.',
          ),
        ),
        p(text('Talk soon,')),
        signature(),
        p(text('P.S. Stuck on anything? Reply here and a real human (sometimes me) will help you out.')),
      ],
    },
  },
  {
    slug: 'plain-02-getting-started',
    name: 'Getting started guide',
    desc: 'Step-by-step numbered walkthrough',
    subject: 'Get set up in 3 steps',
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hi '), firstName, text(',')),
        p(text("Welcome aboard! Rather than throw a manual at you, here's the shortest path to your first win. Just three steps:")),
        {
          type: 'orderedList',
          content: [
            orderedItem('Create a project.', "Give it a name and hit save — that's your workspace."),
            orderedItem('Add three tasks.', 'Drag them onto the board so you can see how work moves.'),
            orderedItem('Invite one teammate.', 'Orbit clicks the moment someone else is in there with you.'),
          ],
        },
        button('Start step 1'),
        p(text("That's honestly the whole thing. Do those three and you'll get how Orbit works better than any tutorial could explain.")),
        signature(),
      ],
    },
  },
  {
    slug: 'plain-03-coupon',
    name: 'Coupon code',
    desc: 'Plain note with a simple coupon',
    subject: 'A small thank-you',
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hey '), firstName, text(',')),
        p(
          text(
            "Quick one. You've been on the free plan a while and I can see you're bumping into the project limit fairly often — so here's 25% off Pro for your first three months.",
          ),
        ),
        p(text('No countdown gimmicks. The code just works through the end of the month:')),
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [text('THANKS25', [{ type: 'bold' }])] },
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [text('Apply at checkout · expires end of month', [{ type: 'italic' }])],
        },
        button('Upgrade and apply it'),
        p(text("If the pricing still doesn't fit your situation, reply and tell me — we're flexible for teams just getting going.")),
        signature(),
      ],
    },
  },
  {
    slug: 'plain-04-checkin',
    name: '3-day check-in',
    desc: 'Personal activation nudge',
    subject: "How's it going so far?",
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hi '), firstName, text(',')),
        p(
          text(
            "Ryan again. I noticed you signed up a few days ago but haven't created your first project yet — totally normal, life gets busy.",
          ),
        ),
        p(text("If something got in the way, I'd love to know what. Most people who stall just aren't sure where to start, so here's the shortcut:")),
        {
          type: 'bulletList',
          content: [bulletItem('Open a blank project'), bulletItem('Add three tasks'), bulletItem("That's it — two minutes, and it clicks")],
        },
        button('Open a blank project'),
        p(text("And if Orbit's not for you, no hard feelings — I'd still appreciate a one-line reply telling me why.")),
        signature(),
      ],
    },
  },
  {
    slug: 'plain-05-feedback',
    name: 'Feedback ask',
    desc: 'One-question plain email',
    subject: 'Can I ask you one question?',
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hi '), firstName, text(',')),
        p(text("You've been using Orbit for a couple weeks now, so one honest question:")),
        p(bold('If Orbit disappeared tomorrow, how disappointed would you be?')),
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [link('Very disappointed', '#'), text(' · '), link('Somewhat', '#'), text(' · '), link('Not really', '#')],
        },
        p(
          text(
            'One click — no form. Your answer tells us more than any survey could, and it directly decides what we build next quarter.',
          ),
        ),
        p(text('Thank you, genuinely.')),
        signature(),
      ],
    },
  },
  {
    slug: 'plain-06-announce',
    name: 'Plain announcement',
    desc: 'Understated update with header image',
    subject: 'We shipped the thing you asked for',
    bodyJson: {
      type: 'doc',
      content: [
        p(text('Hey '), firstName, text(',')),
        p(
          text(
            'A while back you (and a lot of other people) asked if Orbit could handle the repetitive stuff automatically — moving tasks, nudging people, updating statuses. We heard you.',
          ),
        ),
        p(text("As of this morning it's live. It's called Automations, and it's free on your plan. Here are the three we set up first:")),
        {
          type: 'bulletList',
          content: [
            bulletItem('When a task is done → notify whoever created it'),
            bulletItem('When a due date passes → move it to "At risk"'),
            bulletItem("Every Monday → post the week's plan to your channel"),
          ],
        },
        button('Set up your first automation'),
        p(text('No launch fanfare — just wanted the people who asked to be the first to know.')),
        signature(),
      ],
    },
  },
];
