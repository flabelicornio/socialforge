-- Add-ons pagados (ej. Ads Reporting) desacoplados de la licencia base.
-- Una licencia puede tener 0, 1 o varios entitlements activos.

CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id),
  feature_key TEXT NOT NULL,       -- 'ads_reporting', futuros add-ons
  status TEXT NOT NULL CHECK (status IN ('active','cancelled','expired','past_due')),
  source TEXT NOT NULL DEFAULT 'lemonsqueezy',
  external_subscription_id TEXT,   -- id de la suscripción en Lemon Squeezy
  purchased_at INTEGER NOT NULL,
  expires_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_entitlements_license ON entitlements(license_id, feature_key);
