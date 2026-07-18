## Contacts

What this page is for: managing every contact in your outreach database — importing them, searching/filtering, verifying deliverability, and running bulk actions like add-to-list, unsubscribe, or suppress.

**Where to find it:** sidebar > **Contacts** (`/contacts`). A single contact's own page is reached by clicking their name/email anywhere in the app (`/contacts/:id`).

![Contacts](../assets/screenshots/contacts.png)

### Importing contacts from a CSV

1. Click **Import CSV** (top-right of the Contacts list, or the empty-state button if you have no contacts yet).
2. Drop a `.csv` file onto the dialog or click it to browse — any column layout works.
3. On the **map columns** screen, check how each CSV column got auto-guessed (Email, First name, Last name, Full name, a Custom field, or Ignore) and correct any that guessed wrong. Only one column can map to Email/First name/Last name/Full name each — a second column offering the same target shows "(already mapped)" and is disabled.
4. Optionally pick an existing list to add every imported contact to, or type a name and click **+ Create list** to make a new one on the spot. Do the same for tags if you want them tagged on import.
5. Choose the status newly-created contacts should get (Active, Unsubscribed, Bounced, or Suppressed) — this only applies to brand-new rows; contacts that already exist keep whatever status they currently have.
6. Click **Start import**. A progress bar tracks rows processed / created / duplicates / invalid in real time; when it finishes you'll see a full breakdown, plus a list of any rejected rows with the reason (e.g. bad email syntax).

### Searching, filtering, and sorting

1. Type in the search box to filter by email, name, or tag (results update automatically about 300ms after you stop typing).
2. Click a status pill (**All / Active / Unsubscribed / Bounced / Suppressed**) to filter to just that status — each pill shows its own count.
3. Click a column header (**Contact**, **Status**, **Last activity**) to sort by it; click again to reverse the direction.
4. Use the rows-per-page selector and Previous/Next buttons at the bottom to page through large lists — filtering, sorting, and paging all happen on the server, so this stays fast even with thousands of contacts.

### Verifying an email and reading suppression status

- Click the small circular icon next to any contact's name to verify that one address on demand (green check = deliverable, red X = not deliverable, amber triangle = risky/catch-all domain, gray "?" = not yet verified). Hover it for the exact status; click it again any time to re-check.
- A verified **invalid** or **risky** result automatically moves that contact to **Suppressed** status in the background — you don't need to suppress it yourself afterward.
- The **Suppressed** status pill/filter shows everyone currently on the suppression list, regardless of why (hard bounce, spam complaint, repeated soft bounces, manual unsubscribe, or a failed verification) — see `settings-and-members.md` for the full suppression list view with reasons.
- Selecting rows and clicking the **Verify** bulk action in the toolbar only runs the free local syntax/MX check (not the paid Reoon/NeverBounce check) — it's meant as a quick sanity pass over a selection, not a substitute for real verification. Suppressed contacts in the selection are skipped automatically.

### Bulk actions

1. Check the box next to one or more rows (or the header checkbox to select everyone on the current page).
2. With contacts selected, use the toolbar that appears: **Add to list**, **Enroll** (into a sequence), **Verify** (local check, see above), **Unsubscribe**, **Suppress**, or **Delete**.
3. **Delete** asks for confirmation first and warns that it's permanent — it removes the contacts along with their sends, list/tag memberships, and sequence enrollments. There is no undo.

### Viewing and editing a single contact

Open a contact to see their custom fields, toggle tags and list memberships on/off with a click, and manage their sequence enrollments (pause/resume/stop) directly from their profile — see `sequences.md` for what those actions mean.

### Things to know

- Bulk delete is irreversible — double-check your selection before confirming.
- The bulk **Verify** button is a free local check only; use the dedicated **Verification** page for the paid, authoritative Reoon/NeverBounce check across your whole list.
- List/tag toggling on the contact profile is disabled for viewer-role users.
- Column mapping on import only lets each of Email/First name/Last name/Full name be used once — extra matching columns fall back to "Ignore" rather than silently overwriting each other.
