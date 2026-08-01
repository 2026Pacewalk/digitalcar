-- Custom Domains module — additive, safe to run on production.
-- Creates one table that maps a customer/reseller domain to a published card.
-- Idempotent-ish: uses IF NOT EXISTS so re-running won't error.
--
-- Apply on prod:  mysql <db> < db/add-custom-domains.sql
-- (or paste into your DB console). Nothing is dropped or modified.

CREATE TABLE IF NOT EXISTS `custom_domains` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `domain` varchar(255) NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `card_id` int NOT NULL DEFAULT 1,
  `status` enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
  `verify_token` varchar(64) NOT NULL,
  `added_by_role` enum('admin','reseller','customer') NOT NULL DEFAULT 'admin',
  `verified_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `custom_domains_id` PRIMARY KEY(`id`),
  CONSTRAINT `custom_domains_domain_unique` UNIQUE(`domain`)
);

CREATE INDEX `cd_user_card_idx` ON `custom_domains` (`user_id`,`card_id`);
CREATE INDEX `cd_status_idx` ON `custom_domains` (`status`);
