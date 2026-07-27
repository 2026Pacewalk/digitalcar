-- DigitalCarda live INR plans — Trial(7) / Gold(5) / Platinum(6).
-- These IDs match what the app stores in `package_id` (client) and what user
-- subscriptions already point to (7=Trial, 5=Gold, 6=Platinum). Creating the
-- matching subscription_packages rows makes server-side entitlement checks
-- (maxCards, feature flags in api/card-router.ts) actually apply to those users.
-- Idempotent: safe to run again (updates on conflict). Run on prod to sync.

INSERT INTO subscription_packages
  (id, name, slug, description, monthly_price, yearly_price, trial_days,
   max_cards, max_products, max_gallery_images, max_videos, storage_limit_mb,
   feature_custom_domain, feature_seo, feature_analytics, feature_lead_capture,
   feature_remove_branding, feature_white_label, feature_priority_support,
   feature_ai, feature_multilingual, feature_crm, is_active, display_order)
VALUES
  -- Trial: full Gold features, 30 days, 1 card
  (7, 'Trial', 'trial', 'Full Gold features, free for 30 days',
   0.00, 0.00, 30, 1, 25, 20, 8, 100,
   0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0),
  -- Gold: the flagship. Monthly 99 / Yearly 999. 1 card.
  (5, 'Gold', 'gold', 'Everything a business needs',
   99.00, 999.00, 30, 1, 25, 20, 8, 500,
   0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1),
  -- Platinum: premium. Monthly 199 / Yearly 1999. 3 cards, unlimited content.
  (6, 'Platinum', 'platinum', 'For brands that want it all',
   199.00, 1999.00, 30, 3, 9999, 60, 25, 2000,
   1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  description = VALUES(description),
  monthly_price = VALUES(monthly_price),
  yearly_price = VALUES(yearly_price),
  trial_days = VALUES(trial_days),
  max_cards = VALUES(max_cards),
  max_products = VALUES(max_products),
  max_gallery_images = VALUES(max_gallery_images),
  max_videos = VALUES(max_videos),
  storage_limit_mb = VALUES(storage_limit_mb),
  feature_custom_domain = VALUES(feature_custom_domain),
  feature_seo = VALUES(feature_seo),
  feature_analytics = VALUES(feature_analytics),
  feature_lead_capture = VALUES(feature_lead_capture),
  feature_remove_branding = VALUES(feature_remove_branding),
  feature_white_label = VALUES(feature_white_label),
  feature_priority_support = VALUES(feature_priority_support),
  feature_ai = VALUES(feature_ai),
  feature_multilingual = VALUES(feature_multilingual),
  feature_crm = VALUES(feature_crm),
  is_active = VALUES(is_active),
  display_order = VALUES(display_order);

-- Retire the old USD-era demo tiers from the purchase UI (kept, just hidden;
-- existing subscriptions on them are unaffected).
UPDATE subscription_packages SET is_active = 0
  WHERE id IN (1, 2, 3, 4);
