## Templates

What this page is for: writing and managing the reusable email content (subject + rich-text body) that campaigns and sequence steps send.

**Where to find it:** sidebar > **Templates** (`/templates`) for the list; **New template** or clicking a template opens the editor (`/templates/new` or `/templates/:id`).

![Template editor](../assets/screenshots/template-editor.png)

### Creating a template

1. Click **New template**. You'll be offered the **template library** first — pick a prebuilt starter (fully editable) or click **Skip, start blank**.
2. Set the template **name** (top-left, used internally) and **Subject** line. You can include a personalization token in the subject too, e.g. `Hi {{contact.firstName}}`.
3. Write the body using the rich-text toolbar: headings, bold/italic/underline/strikethrough, text alignment, bulleted/numbered lists, blockquotes, a divider, links, images, and a CTA button node.
4. Click **Save**.

### Personalization tokens and spintax

- Click **Insert token ▾** in the toolbar to insert a token like `{{contact.firstName}}`, `{{contact.lastName}}`, or `{{contact.email}}` — these get replaced with the actual contact's data at send time.
- Click **Spintax** to insert a spin block, written as `{option A|option B|option C}` — at send time, one option is picked at random per recipient so different people can receive slightly different wording. You can nest and edit spintax text directly in the body.
- Personalization tokens are always resolved before spintax is resolved, so a token sitting inside a spintax option works correctly (this ordering is handled automatically — you don't need to do anything differently).
- Every actual send resolves spintax exactly once and stores the resolved wording against that send — so if you're debugging what a specific recipient received, or comparing which spin variant performs better, that's always a real record, not a re-roll.

### Previewing and testing before you send

1. Click **Preview** to open a client-style preview. Switch between **Gmail / Outlook / Apple Mail** chrome styles and **Desktop / Mobile** widths to sanity-check layout across common clients.
2. The preview resolves personalization against a sample contact (Alex Doe) and resolves spintax once for the preview render.
3. Click **Send test** (available both in the editor toolbar and inside the Preview modal) to send the current draft to a real inbox — defaults to your own account email, editable to any address — useful for checking real-client rendering before using the template in a live send.

### AI Assist

1. Click **✦ AI Assist** in the toolbar to open a rewrite/generation panel. Describe what you want (or use a quick action: "Make it shorter," "More casual," "Add a stat"), then **Generate**.
2. Review the result, then **Replace content** to swap it into the editor (tokens/buttons written as literal text are parsed back into real nodes) — nothing is applied without you confirming.
3. AI Assist requires an LLM provider (OpenAI or DeepSeek) configured with a real API key in **Settings > Integrations > AI-assisted copy**. If no key is configured, generation calls fail with an error rather than silently doing nothing — there's no default/free fallback provider.

### Shuffle preview and saved variants

1. In the **Shuffle preview** panel (right side of the editor), click **Shuffle** to see 3 randomly-resolved spintax variants of your current subject/body — a quick way to sanity-check what recipients might actually see.
2. Click the **✦** button next to Shuffle to have AI generate one alternate wording of the whole email (same intent/tone/CTA, different phrasing).
3. Click **Save as variant** under any shown variant to save it as its own linked template (visible under "Saved variants," and selectable in a sequence step alongside the original — see `sequences.md`). Saving a variant requires the parent template to already be saved.

### The prebuilt template library

Opened automatically for a brand-new template, or intentionally skippable — browse by name/description/subject line and click one to load it into the editor. Nothing is sent or saved just by picking one; it's a starting point you can freely edit before saving.

### Things to know

- Clicking a link inside the body never navigates you away — it opens a small popover with **Open in new tab** and **Edit** instead, so you can safely click around a template full of real links while editing.
- Template images upload to Cloudflare R2 and are referenced by URL — nothing is embedded as base64 in the document.
- Viewer-role users can view templates but the editor is read-only for them (no Save button, editing disabled).
- "Uses" and "Open rate" columns on the Templates list reflect how a template has performed across the campaigns/sequences that used it.
