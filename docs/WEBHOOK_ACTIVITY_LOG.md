# AWS SNS Webhook Activity Log

## Overview

All AWS SES webhooks (bounces, complaints) are now fully logged and tracked in three complementary tables:

### 1. **webhook_deliveries** - Raw Webhook Records
Every incoming SNS notification is recorded with:
- `payload` - The actual SES event JSON (bounce/complaint details)
- `headers` - SNS headers (message ID, topic ARN, message type)
- `slug` - 'ses-sns' for bounce/complaint, 'ses-sns-subscription' for subscription confirmations
- `signature_valid` - Always true (SNS itself is the source)
- `error` - Populated if parsing failed
- `received_at` - Timestamp

**Useful for:** Replaying webhooks, debugging, audit trails

### 2. **email_events** - Email Lifecycle Events
Each bounce/complaint creates an email_event:
- `type` - 'bounce' or 'complaint'
- `metadata` - JSON containing bounceType ('Permanent', 'Transient', 'Undetermined') for bounces
- `send_id` - Links to the specific send (FK to sends.id)
- `created_at` - Timestamp

**Useful for:** Per-email tracking, analytics, reporting

### 3. **sends.status** - Send Status History
When a webhook arrives:
- `status` - Updated to 'bounced' or 'complained'
- `provider_message_id` - Matches SNS mail.messageId to correlate events

**Useful for:** Circuit breaker (rolling bounce rate), send history

---

## Querying Activity by Campaign

### All bounces/complaints for a campaign:
```sql
SELECT 
  s.id as send_id,
  c.email,
  ee.type as event_type,
  ee.metadata->>'bounceType' as bounce_type,
  ee.created_at,
  s.status
FROM email_events ee
JOIN sends s ON ee.send_id = s.id
JOIN contacts c ON s.contact_id = c.id
WHERE s.campaign_id = 'CAMPAIGN_ID_HERE'
  AND ee.type IN ('bounce', 'complaint')
ORDER BY ee.created_at DESC;
```

### Bounce rate for a campaign:
```sql
SELECT 
  COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) as total_bounces,
  COUNT(CASE WHEN s.status = 'complained' THEN 1 END) as total_complaints,
  COUNT(*) as total_sends,
  ROUND(100.0 * COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) / COUNT(*), 2) as bounce_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN s.status = 'complained' THEN 1 END) / COUNT(*), 2) as complaint_rate_pct
FROM sends s
WHERE s.campaign_id = 'CAMPAIGN_ID_HERE';
```

### Permanent vs transient bounces:
```sql
SELECT 
  ee.metadata->>'bounceType' as bounce_type,
  COUNT(*) as count
FROM email_events ee
JOIN sends s ON ee.send_id = s.id
WHERE s.campaign_id = 'CAMPAIGN_ID_HERE'
  AND ee.type = 'bounce'
GROUP BY ee.metadata->>'bounceType';
```

---

## Querying Activity by Sequence

### All bounces/complaints in a sequence:
```sql
SELECT 
  s.id as send_id,
  c.email,
  ee.type,
  ee.metadata->>'bounceType' as bounce_type,
  ee.created_at,
  st.name as step_name
FROM email_events ee
JOIN sends s ON ee.send_id = s.id
JOIN contacts c ON s.contact_id = c.id
JOIN sequence_steps st ON s.sequence_step_id = st.id
WHERE s.sequence_id = 'SEQUENCE_ID_HERE'
  AND ee.type IN ('bounce', 'complaint')
ORDER BY ee.created_at DESC;
```

---

## Webhook Payload Reference

### Bounce Notification (logged in webhook_deliveries.payload)
```json
{
  "notificationType": "Bounce",
  "mail": {
    "messageId": "00000146b93f-...",
    ...
  },
  "bounce": {
    "bounceType": "Permanent|Transient|Undetermined",
    "bouncedRecipients": [
      {
        "emailAddress": "user@example.com",
        "status": "5.1.1",
        "diagnosticCode": "smtp; 550 user unknown"
      }
    ]
  }
}
```

### Complaint Notification
```json
{
  "notificationType": "Complaint",
  "mail": {
    "messageId": "00000146b93f-...",
    ...
  },
  "complaint": {
    "complainedRecipients": [
      {
        "emailAddress": "user@example.com"
      }
    ]
  }
}
```

---

## Event Flow

1. **AWS SNS** sends bounce/complaint webhook to `/webhooks/ses/sns`
2. **SesSnsController** receives and logs to `webhook_deliveries`
3. **SuppressionService** marks email as suppressed (hard_bounce/complaint)
4. **SesSnsController** creates `email_events` record
5. **SesSnsController** emits event to internal bus:
   - `email.bounced` → triggers automation workflows
   - `email.complained` → triggers automation workflows
6. **OutboundWebhookEventListener** forwards events to subscribed external webhooks
7. **sends.status** updated for circuit breaker bounce-rate tracking

---

## Viewing Raw Webhook Deliveries

```sql
-- Last 10 SES SNS webhooks
SELECT 
  slug,
  payload->>'notificationType' as event_type,
  (payload->'bounce'->>'bounceType') as bounce_type,
  (payload->'mail'->>'messageId') as provider_message_id,
  received_at,
  error
FROM webhook_deliveries
WHERE slug = 'ses-sns'
ORDER BY received_at DESC
LIMIT 10;
```

---

## Why Three Tables?

| Table | Purpose | Updated By | Query Use |
|-------|---------|-----------|-----------|
| `webhook_deliveries` | Audit trail, replay capability | AWS SNS handler (before processing) | Debugging, compliance |
| `email_events` | Event history, analytics | SesSnsController | Reporting, per-email tracking |
| `sends.status` | Circuit breaker input | SesSnsController | Bounce rate calculation |
| Internal events | Automation triggers | SesSnsController | Workflows, external webhooks |

This redundancy ensures:
- **Auditability**: Raw webhooks preserved in webhook_deliveries
- **Traceability**: Each send's full event history in email_events
- **Actionability**: Events trigger workflows and external integrations
- **Circuit protection**: sends.status feeds bounce-rate detection
