-- Corre esto en la consola D1 además de schema.sql y schema_entitlements.sql
-- (tu base ya existe, así que es un ALTER, no un CREATE).

ALTER TABLE oauth_exchanges ADD COLUMN result_json TEXT;
