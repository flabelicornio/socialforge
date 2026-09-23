-- Base de datos LOCAL del usuario. Vive en su máquina, no en la nube.

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  platform TEXT NOT NULL, -- instagram|facebook|tiktok|linkedin|youtube|x|pinterest|threads
  display_name TEXT NOT NULL,
  connected_at INTEGER NOT NULL
  -- El access_token/refresh_token NO va en esta tabla.
  -- Se guarda cifrado en el Keychain/Credential Manager del SO,
  -- referenciado por account.id como key.
);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  local_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  text TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL, -- JSON array: ["instagram","facebook"]
  media_ids TEXT NOT NULL DEFAULT '[]', -- JSON array de media_assets.id
  scheduled_for INTEGER, -- epoch ms, NULL = draft
  status TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING|READY|PROCESSING|PUBLISHED|FAILED|RETRY|READY_FOR_USER
  failure_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  platform TEXT NOT NULL,
  run_at INTEGER NOT NULL, -- cuándo debe intentar publicar
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Configuración inicial: ventana de continuidad de la cola (2 semanas por defecto)
INSERT INTO settings (key, value) VALUES ('queue_retention_days', '14');
INSERT INTO settings (key, value) VALUES ('local_only_mode', 'false');

CREATE INDEX idx_jobs_run_at ON jobs(run_at);
CREATE INDEX idx_posts_workspace ON posts(workspace_id);
