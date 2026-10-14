# Gmail Push Setup (T10) — optional, poller is the default

The replied-only inbox works out of the box via the 3-minute
`gmail-reply-poll` BullMQ poller. Push makes replies appear in <60s.

## 1. Create the Pub/Sub topic

```bash
gcloud pubsub topics create gmail-inbox-push --project=YOUR_PROJECT
gcloud pubsub subscriptions create gmail-inbox-push-sub \
  --topic=gmail-inbox-push \
  --push-endpoint=https://YOUR_API/webhooks/gmail/push \
  --project=YOUR_PROJECT
```
Grant Gmail permission to publish:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-inbox-push \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher \
  --project=YOUR_PROJECT
```

## 2. Configure env

```bash
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/gmail-inbox-push
```

No shared secret needed — the push handler only honors notifications whose
`emailAddress` matches a connected, active Gmail sender account (Settings >
Sender Accounts). Unknown or disconnected mailboxes are ignored, and the
account's own OAuth connection does the Gmail API work.

## 3. Verify

- `GmailWatchService.renewAll()` runs on a 5-day interval (watch expires in 7 days).
- Push handler (`POST /webhooks/gmail/push`) triggers a targeted `pollAccount()` and dedupes by `providerMessageId`.
- If push misses anything, the 3-minute poller catches it.
- Watch state: check API logs for `watch renew <email> failed` warnings.
