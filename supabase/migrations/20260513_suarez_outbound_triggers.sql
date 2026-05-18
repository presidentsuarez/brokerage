-- Confirm pg_net is enabled (per REAP handoff doc it should be)
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_net', 'pg_cron');

-- Shared outbound URL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.suarez_outbound_url') THEN
    -- We don't store the URL in custom settings — just hardcode it in the trigger functions for simplicity
    NULL;
  END IF;
END $$;

-- Drop existing triggers/functions if reinstalling
DROP TRIGGER IF EXISTS suarez_outbound_user_insert ON user_profiles;
DROP TRIGGER IF EXISTS suarez_outbound_user_update ON user_profiles;
DROP TRIGGER IF EXISTS suarez_outbound_deal_update ON deals;
DROP TRIGGER IF EXISTS suarez_outbound_ticket_insert ON support_tickets;
DROP FUNCTION IF EXISTS notify_suarez_event();

-- Single trigger function that handles all 4 cases
CREATE OR REPLACE FUNCTION notify_suarez_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  payload JSONB;
  source_id TEXT;
  outbound_url TEXT := 'https://cpgwnrpaflaftlxrzlar.supabase.co/functions/v1/suarez-webhook-outbound';
BEGIN
  -- Determine event_type, payload, and source_id based on table + operation
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'INSERT' THEN
      event_type := 'user_signed_up';
      source_id := COALESCE(NEW.email, NEW.id::text);
      payload := jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'plan_tier', NEW.plan_tier,
        'is_subscribed', NEW.is_subscribed,
        'created_at', NEW.created_at
      );
    ELSIF TG_OP = 'UPDATE' THEN
      -- Only fire if plan or subscription actually changed
      IF COALESCE(OLD.plan_tier, '') = COALESCE(NEW.plan_tier, '')
         AND COALESCE(OLD.is_subscribed, FALSE) = COALESCE(NEW.is_subscribed, FALSE) THEN
        RETURN NEW;
      END IF;
      event_type := 'user_plan_changed';
      source_id := COALESCE(NEW.email, NEW.id::text);
      payload := jsonb_build_object(
        'email', NEW.email,
        'old_plan_tier', OLD.plan_tier, 'new_plan_tier', NEW.plan_tier,
        'old_is_subscribed', OLD.is_subscribed, 'new_is_subscribed', NEW.is_subscribed
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'deals' THEN
    -- Only fire on stage change
    IF COALESCE(OLD.deal_status, '') = COALESCE(NEW.deal_status, '') THEN
      RETURN NEW;
    END IF;
    event_type := 'deal_status_changed';
    source_id := NEW.id::text;
    payload := jsonb_build_object(
      'deal_id', NEW.id,
      'property_address', NEW.property_address,
      'city', NEW.city,
      'state', NEW.state,
      'old_status', OLD.deal_status,
      'new_status', NEW.deal_status,
      'org_id', NEW.org_id,
      'asking_price', NEW.asking_price,
      'reap_score', NEW.reap_score
    );
  ELSIF TG_TABLE_NAME = 'support_tickets' THEN
    event_type := 'support_ticket_created';
    source_id := NEW.id::text;
    payload := jsonb_build_object(
      'ticket_id', NEW.id,
      'user_email', NEW.user_email,
      'subject', NEW.subject,
      'category', NEW.category,
      'priority', NEW.priority,
      'status', NEW.status
    );
  END IF;

  IF event_type IS NOT NULL THEN
    PERFORM net.http_post(
      url := outbound_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'event_type', event_type,
        'idempotency_key', gen_random_uuid()::text,
        'source_record_id', source_id,
        'payload', payload
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break the originating INSERT/UPDATE because of webhook failure
  RAISE WARNING 'suarez webhook trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to tables
CREATE TRIGGER suarez_outbound_user_insert
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION notify_suarez_event();

CREATE TRIGGER suarez_outbound_user_update
  AFTER UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION notify_suarez_event();

CREATE TRIGGER suarez_outbound_deal_update
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION notify_suarez_event();

CREATE TRIGGER suarez_outbound_ticket_insert
  AFTER INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_suarez_event();

-- Verify
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'suarez_outbound_%'
ORDER BY trigger_name;
