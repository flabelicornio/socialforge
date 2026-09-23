-- Add-on: Ads Reporting (requiere entitlement pagado vía Lemon Squeezy)

CREATE TABLE ad_accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  platform TEXT NOT NULL,           -- 'meta_ads','google_ads','tiktok_ads'
  external_account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  connected_at INTEGER NOT NULL
  -- El token de ads_read vive en el Keychain, igual que las cuentas orgánicas.
);

CREATE TABLE ad_reports_cache (
  id TEXT PRIMARY KEY,
  ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  metrics_json TEXT NOT NULL,        -- JSON: spend, impressions, clicks, ctr, etc.
  fetched_at INTEGER NOT NULL
);

-- Se actualiza cada vez que /license/validate responde con los entitlements.
-- La UI lee este flag para pintar el panel bloqueado o desbloqueado,
-- sin necesitar internet para saber qué mostrar.
INSERT INTO settings (key, value) VALUES ('ads_reporting_entitled', 'false');

CREATE INDEX idx_ad_reports_account ON ad_reports_cache(ad_account_id);
