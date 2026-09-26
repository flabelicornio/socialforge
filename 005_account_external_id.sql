-- Guarda a qué Página/cuenta real de la red corresponde cada registro,
-- y datos extra (ej. el id de la cuenta de Instagram ligada a la Página).
-- El access_token NUNCA va aquí — vive en el Keychain del sistema operativo.

ALTER TABLE accounts ADD COLUMN external_account_id TEXT;
ALTER TABLE accounts ADD COLUMN extra_json TEXT;
