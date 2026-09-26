-- Licencias
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free','pro','agency')),
  status TEXT NOT NULL CHECK (status IN ('active','expired','trial','cancelled')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  max_devices INTEGER NOT NULL DEFAULT 1
);

-- Dispositivos activados por licencia
CREATE TABLE license_devices (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id),
  device_fingerprint TEXT NOT NULL,
  activated_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

-- Intercambios OAuth en tránsito (el token final NUNCA se guarda aquí)
CREATE TABLE oauth_exchanges (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id),
  platform TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);

-- Manifest de actualizaciones para el auto-updater de Tauri
CREATE TABLE app_releases (
  version TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  signature TEXT NOT NULL,
  notes TEXT,
  published_at INTEGER NOT NULL
);
