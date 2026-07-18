## Email Log

What this page is for: a single searchable record of every individual email ever sent — from campaigns and sequences alike — with its delivery status and full engagement timeline.

**Where to find it:** sidebar > **Email Log** (`/email-log`).

### Filtering and searching

1. Use the status filter pills — **All / Sent / Bounced / Complained / Suppressed / Failed** — to narrow the table to one delivery outcome.
2. Type in the search box to match a recipient's email or the resolved subject line. Search filters only the currently loaded page of results; clear it to page through the complete, unfiltered result set using Previous/Next.

### Opening the detail drawer

1. Click any row to open a right-side drawer with the full record: recipient, resolved subject, which sender provider handled it (SES/Gmail), and any error message if the send failed.
2. **Resolved body** shows the exact HTML that was actually sent to that recipient — this is the literal, already-resolved spintax/personalization output for that one send, not the live template (so it's the right place to check "what did this specific person actually receive").
3. **Delivery timeline** lists every tracked event for that send (e.g. open, click, with the clicked URL) in order, each with its own timestamp.

### Things to know

- Results are paginated at 50 rows per page.
- "Suppressed" here means the send was blocked because that address was on the suppression list at send time — it never actually went out.
- A row with no delivery timeline events yet doesn't mean nothing happened — an open/click is only recorded once the recipient's client actually loads the tracking pixel/link, which can lag behind the send itself or never happen at all for a given recipient.
