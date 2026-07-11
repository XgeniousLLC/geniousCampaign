# Design reference

`geniusCampaign.dc.html` is the canonical visual design for the admin panel, imported from the Claude Design project at https://claude.ai/design/p/fa56872c-3389-4788-a1a3-35287fd8b951 (owner: Sharifur). `support.js` is that tool's own preview runtime — it expects `window.React`/`window.ReactDOM` to already be injected by the claude.ai/design environment, so **don't try to open `geniusCampaign.dc.html` directly in a browser** — it won't render standalone (it'll throw `window.React is not available yet`). To view it, open the claude.ai/design link above. Both files are kept here purely as a durable local reference for the markup/styling, not as something to run.

## What's in it

One file, 18 screens plus 6 modals, built with inline styles (hex colors, px values) rather than Tailwind classes — that's expected, it's a design tool's output format, not production code. Every screen/modal is delimited by an HTML comment you can grep for:

```
DASHBOARD · CONTACTS · CONTACT DETAIL · TEMPLATES · TEMPLATE EDITOR ·
SEQUENCES LIST · SEQUENCE BUILDER / DETAIL · EMAIL LOG · CAMPAIGNS LIST ·
CAMPAIGN COMPOSE · CAMPAIGN DETAIL · LISTS & TAGS · TRIGGERS ·
SENDER ACCOUNTS · WEBHOOKS · VERIFICATION · SETTINGS

Modals: CSV IMPORT · SPINTAX EDIT · AI ASSIST · ENROLL · EMAIL LOG DETAIL DRAWER · NEW TRIGGER
```

`grep -n "<!-- =" docs/design/geniusCampaign.dc.html` jumps straight to any of these.

## One new requirement this design surfaced

The **AI Assist modal** (prompt → generated copy → insert into template) isn't in the original ticket backlog — it needs an LLM API key (Anthropic or OpenAI) that only Sharifur can provide, and a decision on which provider. Added as **GC-059** in `TICKETS.md`, marked `Blocked (needs decision)` rather than guessed at.

## Translating this into the real app

This file is the visual/interaction spec, not the implementation — it uses a custom templating syntax (`{{ }}` bindings, `<sc-if>`/`<sc-for>` control-flow tags) specific to the design tool, not real React/JSX. When implementing a screen:

1. Read the relevant section for exact layout, spacing, copy, and interaction states (hover styles are in `style-hover="..."` attributes, conditional UI in `<sc-if>` blocks).
2. Rebuild it as real React + Tailwind using `DESIGN_TOKENS.md`'s token mapping instead of copying the inline hex/px values — every color and spacing value in the file should map to a Tailwind class from that mapping, not a one-off `style={{ color: '#E7E9EE' }}`.
3. Where the design implies data (contact counts, quota bars, notification lists), wire it to the real API from the corresponding backend ticket — the design uses placeholder/mock content throughout.
