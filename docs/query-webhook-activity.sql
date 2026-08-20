-- Webhook Activity Query Helpers
-- Usage: psql genius-campaign < docs/query-webhook-activity.sql

-- ============================================================
-- 1. RECENT WEBHOOK DELIVERIES
-- ============================================================
-- View the last 20 webhook hits from AWS
SELECT
  received_at,
  payload->>'notificationType' as event_type,
  (payload->'bounce'->>'bounceType') as bounce_type,
  (payload->'mail'->>'messageId') as provider_message_id,
  CASE WHEN error IS NOT NULL THEN 'ERROR: ' || error ELSE 'OK' END as status
FROM webhook_deliveries
WHERE slug = 'ses-sns'
ORDER BY received_at DESC
LIMIT 20;


-- ============================================================
-- 2. BOUNCES & COMPLAINTS BY DAY
-- ============================================================
-- See volume of email events by day
SELECT
  DATE(ee.created_at) as date,
  ee.type,
  COUNT(*) as count,
  COUNT(CASE WHEN ee.metadata->>'bounceType' = 'Permanent' THEN 1 END) as permanent,
  COUNT(CASE WHEN ee.metadata->>'bounceType' = 'Transient' THEN 1 END) as transient
FROM email_events ee
WHERE ee.type IN ('bounce', 'complaint')
GROUP BY DATE(ee.created_at), ee.type
ORDER BY date DESC;


-- ============================================================
-- 3. BOUNCE RATE TREND (last 7 days)
-- ============================================================
-- Track bounce rate over time
SELECT
  DATE(s.sent_at) as date,
  COUNT(*) as total_sends,
  COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) as bounced,
  COUNT(CASE WHEN s.status = 'complained' THEN 1 END) as complained,
  ROUND(100.0 * COUNT(CASE WHEN s.status IN ('bounced', 'complained') THEN 1 END) / COUNT(*), 2) as bounce_complaint_rate_pct
FROM sends s
WHERE s.sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(s.sent_at)
ORDER BY date DESC;


-- ============================================================
-- 4. TOP BOUNCING DOMAINS
-- ============================================================
-- Identify which domains have the most bounces
SELECT
  SUBSTRING(c.email FROM POSITION('@' IN c.email) + 1) as domain,
  COUNT(*) as bounce_count,
  ROUND(100.0 * COUNT(*) /
    (SELECT COUNT(*) FROM email_events WHERE type = 'bounce'), 2) as pct_of_total
FROM email_events ee
JOIN sends s ON ee.send_id = s.id
JOIN contacts c ON s.contact_id = c.id
WHERE ee.type = 'bounce'
GROUP BY domain
ORDER BY bounce_count DESC
LIMIT 20;


-- ============================================================
-- 5. WEBHOOK PROCESSING ERRORS
-- ============================================================
-- See any failed webhook processing
SELECT
  received_at,
  slug,
  error,
  payload
FROM webhook_deliveries
WHERE error IS NOT NULL
ORDER BY received_at DESC
LIMIT 10;


-- ============================================================
-- 6. CAMPAIGN PERFORMANCE SUMMARY
-- ============================================================
-- Bounce/complaint rates per campaign (replace CAMPAIGN_ID)
SELECT
  c.name as campaign,
  COUNT(s.id) as total_sends,
  COUNT(CASE WHEN s.status = 'sent' THEN 1 END) as successful,
  COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) as bounced,
  COUNT(CASE WHEN s.status = 'complained' THEN 1 END) as complained,
  ROUND(100.0 * COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) / COUNT(s.id), 2) as bounce_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN s.status = 'complained' THEN 1 END) / COUNT(s.id), 2) as complaint_rate_pct
FROM sends s
JOIN campaigns c ON s.campaign_id = c.id
GROUP BY c.id, c.name
ORDER BY bounced DESC;


-- ============================================================
-- 7. SEQUENCE ENROLLMENT HEALTH
-- ============================================================
-- Show bounce/complaint rates per sequence
SELECT
  seq.name as sequence,
  COUNT(s.id) as total_sends,
  COUNT(CASE WHEN s.status = 'bounced' THEN 1 END) as bounced,
  COUNT(CASE WHEN s.status = 'complained' THEN 1 END) as complained,
  ROUND(100.0 * COUNT(CASE WHEN s.status IN ('bounced', 'complained') THEN 1 END) / COUNT(s.id), 2) as issue_rate_pct
FROM sends s
JOIN sequences seq ON s.sequence_id = seq.id
WHERE s.sequence_id IS NOT NULL
GROUP BY seq.id, seq.name
ORDER BY issue_rate_pct DESC;


-- ============================================================
-- 8. CONTACTS WITH MULTIPLE BOUNCES
-- ============================================================
-- Find problematic contacts
SELECT
  c.email,
  COUNT(ee.id) as event_count,
  COUNT(CASE WHEN ee.type = 'bounce' THEN 1 END) as bounces,
  COUNT(CASE WHEN ee.type = 'complaint' THEN 1 END) as complaints,
  MAX(ee.created_at) as last_event
FROM contacts c
JOIN sends s ON c.id = s.contact_id
JOIN email_events ee ON s.id = ee.send_id
WHERE ee.type IN ('bounce', 'complaint')
GROUP BY c.id, c.email
HAVING COUNT(*) > 1
ORDER BY event_count DESC;


-- ============================================================
-- 9. PERMANENT VS TRANSIENT BOUNCE BREAKDOWN
-- ============================================================
-- Analyze bounce types
SELECT
  COALESCE(ee.metadata->>'bounceType', 'Unknown') as bounce_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM email_events WHERE type = 'bounce'), 2) as pct
FROM email_events ee
WHERE ee.type = 'bounce'
GROUP BY ee.metadata->>'bounceType'
ORDER BY count DESC;


-- ============================================================
-- 10. WEBHOOK DELIVERY VOLUME (last 24 hours)
-- ============================================================
-- How many webhooks received
SELECT
  payload->>'notificationType' as event_type,
  COUNT(*) as count,
  MIN(received_at) as earliest,
  MAX(received_at) as latest
FROM webhook_deliveries
WHERE slug = 'ses-sns'
  AND received_at >= NOW() - INTERVAL '24 hours'
GROUP BY payload->>'notificationType'
ORDER BY count DESC;
