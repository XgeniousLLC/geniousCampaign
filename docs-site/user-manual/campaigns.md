## Campaigns

What this page is for: sending a one-off broadcast email to a list, a set of tags, or a hand-picked group of contacts, and tracking how it performed afterward.

**Where to find it:** sidebar > **Campaigns** (`/campaigns`) for the list; **New campaign** opens the composer (`/campaigns/new`), and clicking a campaign opens its detail page (`/campaigns/:id`).

![Campaign detail](../../docs/screenshots/campaign-detail.png)

### Composing a new campaign

1. Click **New campaign**. Give it a name (defaults to "Campaign — <today's date>").
2. Pick a **Template** — the dropdown groups any saved shuffle/AI variants (see `templates.md`) under their original template.
3. Choose your **Audience** type:
   - **List** — sends to everyone in one or more selected lists (union, not intersection).
   - **Tags** — sends to any contact with at least one selected tag.
   - **Individual contacts** — hand-pick specific people (search and optionally filter by tag first) — useful for a small VIP send or a test batch.
4. Optionally pick one or more lists under **Exclude contacts in list(s)** to remove anyone in those lists from the audience, regardless of which audience type you chose. Suppressed contacts are always excluded automatically — you'll see a confirmation checkmark for this.
5. Watch the **Pre-send summary** panel on the right — it shows a live estimated recipient count as you adjust the audience.

### Choosing a sender, From name, and reply-to

1. Under **Sender**, leave it on **Auto (best available)** to let the system pick whichever active sender account has the most daily quota headroom remaining, or pick a specific SES/Gmail account by name.
2. A specific pick that later runs out of quota or gets deactivated blocks the send with an error rather than silently switching to another account — pick "Auto" if you don't need a specific sending identity.
3. Optionally set a **From name** and **Reply-to** address — both are optional overrides layered on top of whichever sender account is used.

### Dry-run, send-to-self, scheduling, and sending

1. **Dry-run** is on by default for new campaigns — it previews the send without actually delivering mail. Turn it off (toggle in the summary panel) when you're ready for a real send.
2. **Send-to-self**: enter an email address to redirect every recipient's copy to that one inbox instead — useful for QA'ing exactly what a live campaign would look like before sending it for real, without emailing your actual list.
3. **Schedule for later**: toggle it on and pick a future date/time with the date picker — the campaign stays a draft with a "scheduled" badge until that time arrives. You can **Cancel schedule** any time before it fires.
4. Click **Save as draft** to save without sending, or **Send dry run** / **Send campaign** / **Schedule send** (the button label adapts to your current toggle state).
5. **Large-send confirmation**: if the recipient count is over the configured threshold, sending is blocked until you tick an explicit "I've reviewed the template and list — send anyway" checkbox — this applies server-side too, so it can't be bypassed by retrying quickly.

### Editing a draft

Only campaigns still in **draft** status can be edited — click **Edit** from the campaign detail page. Once a campaign has started sending, its audience/template/sender settings are locked; you'd create a new campaign instead.

### Reading campaign results

On a campaign's detail page you'll find:

- Status badges: draft / sending / sent / failed, plus "scheduled" and "dry run" indicators when applicable.
- Four headline stats: **Delivered, Opens, Clicks, Bounces**, each with a percentage.
- An **engagement funnel** (Delivered → Opened → Clicked) and a **ratio stats** panel (open rate, click rate, click-to-open rate, bounce rate).
- A filterable **recipient list** (All / Opened / Clicked / Bounced tabs) — each row shows the contact, their status/engagement, any per-recipient error, and send timestamp.
- While a campaign is actively sending, the page polls automatically every couple of seconds so you can watch progress without refreshing manually.

### Things to know

- A campaign that's over the large-send threshold requires the confirmation checkbox both in the composer and again if triggered from the detail page's **Send now** button.
- The **Auto** sender option deliberately won't fail over mid-send to a different account if your specifically-chosen one runs dry — that's a design choice to keep sender identity predictable, not a bug.
- "Delivered" on the detail page means the provider accepted/sent it — it isn't the same as "opened," which depends on the recipient's mail client loading the open-tracking pixel.
