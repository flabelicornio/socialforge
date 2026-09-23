export interface Env {
  DB: D1Database;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_LOGIN_CONFIG_ID?: string;
  INSTAGRAM_CLIENT_SECRET?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  TIKTOK_CLIENT_SECRET?: string;
  LEMONSQUEEZY_WEBHOOK_SECRET?: string;
}

const GRAPH_API_VERSION = "v26.0";

// Verifica la firma HMAC-SHA256 que Lemon Squeezy manda en cada webhook.
async function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const digestHex = [...new Uint8Array(sigBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex === signatureHeader;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function uuid(): string {
  return crypto.randomUUID();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // POST /license/activate { email, deviceFingerprint, plan? }
      if (path === "/license/activate" && method === "POST") {
        const body = await request.json<{
          email: string;
          deviceFingerprint: string;
          plan?: "free" | "pro" | "agency";
        }>();

        if (!body.email || !body.deviceFingerprint) {
          return json({ error: "email y deviceFingerprint son requeridos" }, 400);
        }

        const existing = await env.DB.prepare(
          "SELECT * FROM licenses WHERE email = ?"
        )
          .bind(body.email)
          .first();

        let licenseId: string;

        if (existing) {
          licenseId = existing.id as string;
        } else {
          licenseId = uuid();
          await env.DB.prepare(
            `INSERT INTO licenses (id, email, plan, status, created_at, max_devices)
             VALUES (?, ?, ?, 'active', ?, ?)`
          )
            .bind(licenseId, body.email, body.plan ?? "free", Date.now(), 1)
            .run();
        }

        await env.DB.prepare(
          `INSERT INTO license_devices (id, license_id, device_fingerprint, activated_at, last_seen_at)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(uuid(), licenseId, body.deviceFingerprint, Date.now(), Date.now())
          .run();

        return json({ licenseId });
      }

      // POST /license/validate { licenseId, deviceFingerprint }
      if (path === "/license/validate" && method === "POST") {
        const body = await request.json<{ licenseId: string; deviceFingerprint: string }>();

        const license = await env.DB.prepare("SELECT * FROM licenses WHERE id = ?")
          .bind(body.licenseId)
          .first();

        if (!license) return json({ valid: false, reason: "not_found" }, 404);

        const expired =
          license.expires_at !== null &&
          (license.expires_at as number) < Date.now();

        return json({
          valid: license.status === "active" && !expired,
          plan: license.plan,
          status: license.status,
        });
      }

      // GET /oauth/facebook/start?licenseId=X — inicia el flujo real con Meta.
      if (path === "/oauth/facebook/start" && method === "GET") {
        const licenseId = url.searchParams.get("licenseId");
        if (!licenseId || !env.FACEBOOK_APP_ID || !env.FACEBOOK_LOGIN_CONFIG_ID) {
          return json(
            { error: "licenseId requerido, o falta configurar FACEBOOK_APP_ID / FACEBOOK_LOGIN_CONFIG_ID" },
            400
          );
        }
        const state = uuid();
        await env.DB.prepare(
          `INSERT INTO oauth_exchanges (id, license_id, platform, state, created_at, consumed)
           VALUES (?, ?, 'facebook', ?, ?, 0)`
        )
          .bind(uuid(), licenseId, state, Date.now())
          .run();

        const redirectUri = `${url.origin}/oauth/facebook/callback`;

        const authUrl =
          `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth` +
          `?client_id=${env.FACEBOOK_APP_ID}` +
          `&config_id=${env.FACEBOOK_LOGIN_CONFIG_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&state=${state}`;

        return Response.redirect(authUrl, 302);
      }

      // GET /oauth/facebook/callback — a donde Meta redirige después del login.
      if (path === "/oauth/facebook/callback" && method === "GET") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
          return new Response("Falta code o state en la respuesta de Meta.", { status: 400 });
        }

        const pending = await env.DB.prepare(
          `SELECT * FROM oauth_exchanges WHERE state = ? AND platform = 'facebook' AND consumed = 0`
        )
          .bind(state)
          .first();

        if (!pending) {
          return new Response("Estado inválido o ya usado.", { status: 400 });
        }

        try {
          const redirectUri = `${url.origin}/oauth/facebook/callback`;

          const shortTokenRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token` +
              `?client_id=${env.FACEBOOK_APP_ID}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}` +
              `&client_secret=${env.FACEBOOK_CLIENT_SECRET}` +
              `&code=${code}`
          );
          const shortTokenData = await shortTokenRes.json<{ access_token?: string; error?: unknown }>();
          if (!shortTokenData.access_token) {
            throw new Error("No se pudo obtener el token de corta duración: " + JSON.stringify(shortTokenData));
          }

          const longTokenRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token` +
              `?grant_type=fb_exchange_token` +
              `&client_id=${env.FACEBOOK_APP_ID}` +
              `&client_secret=${env.FACEBOOK_CLIENT_SECRET}` +
              `&fb_exchange_token=${shortTokenData.access_token}`
          );
          const longTokenData = await longTokenRes.json<{ access_token?: string }>();
          const userToken = longTokenData.access_token ?? shortTokenData.access_token;

          const pagesRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts` +
              `?fields=id,name,access_token,instagram_business_account` +
              `&access_token=${userToken}`
          );
          const pagesData = await pagesRes.json<{ data?: unknown[] }>();

          await env.DB.prepare(`UPDATE oauth_exchanges SET result_json = ? WHERE id = ?`)
            .bind(JSON.stringify({ userToken, pages: pagesData.data ?? [] }), pending.id)
            .run();

          return new Response(
            `<html><body style="font-family:system-ui;text-align:center;padding:4rem">
              <h2>Cuenta conectada ✅</h2>
              <p>Ya puedes regresar a SocialForge.</p>
            </body></html>`,
            { headers: { "content-type": "text/html" } }
          );
        } catch (err) {
          return new Response("Error completando el login con Meta: " + String(err), { status: 500 });
        }
      }

      // GET /oauth/facebook/result?state=X
      if (path === "/oauth/facebook/result" && method === "GET") {
        const state = url.searchParams.get("state");
        const pending = await env.DB.prepare(
          `SELECT * FROM oauth_exchanges WHERE state = ? AND platform = 'facebook'`
        )
          .bind(state)
          .first();

        if (!pending) return json({ error: "estado no encontrado" }, 404);
        if (!pending.result_json) return json({ pending: true });

        const result = JSON.parse(pending.result_json as string);
        await env.DB.prepare(`UPDATE oauth_exchanges SET consumed = 1, result_json = NULL WHERE id = ?`)
          .bind(pending.id)
          .run();

        return json({ pending: false, ...result });
      }

      // POST /oauth/:platform/start — genérico para el resto de plataformas
      const startMatch = path.match(/^\/oauth\/([a-z]+)\/start$/);
      if (startMatch && method === "POST") {
        const platform = startMatch[1];
        const body = await request.json<{ licenseId: string }>();
        const state = uuid();

        await env.DB.prepare(
          `INSERT INTO oauth_exchanges (id, license_id, platform, state, created_at, consumed)
           VALUES (?, ?, ?, ?, ?, 0)`
        )
          .bind(uuid(), body.licenseId, platform, state, Date.now())
          .run();

        return json({
          authUrl: `https://example-oauth-provider/${platform}/authorize?state=${state}`,
          state,
        });
      }

      // POST /oauth/:platform/exchange { code, state }
      const exchangeMatch = path.match(/^\/oauth\/([a-z]+)\/exchange$/);
      if (exchangeMatch && method === "POST") {
        const platform = exchangeMatch[1];
        const body = await request.json<{ code: string; state: string }>();

        const pending = await env.DB.prepare(
          `SELECT * FROM oauth_exchanges WHERE state = ? AND platform = ? AND consumed = 0`
        )
          .bind(body.state, platform)
          .first();

        if (!pending) return json({ error: "estado inválido o ya usado" }, 400);

        await env.DB.prepare(`UPDATE oauth_exchanges SET consumed = 1 WHERE id = ?`)
          .bind(pending.id)
          .run();

        return json({
          note: "Implementar intercambio real por plataforma antes de producción.",
          accessToken: "PENDIENTE_IMPLEMENTAR",
        });
      }

      // GET /updates/:platform/latest
      const updateMatch = path.match(/^\/updates\/([a-z]+)\/latest$/);
      if (updateMatch && method === "GET") {
        const platform = updateMatch[1];
        const release = await env.DB.prepare(
          `SELECT * FROM app_releases WHERE platform = ? ORDER BY published_at DESC LIMIT 1`
        )
          .bind(platform)
          .first();

        if (!release) return json({ error: "sin releases todavía" }, 404);
        return json(release);
      }

      // POST /webhooks/lemonsqueezy
      if (path === "/webhooks/lemonsqueezy" && method === "POST") {
        const rawBody = await request.text();
        const signature = request.headers.get("x-signature");

        if (env.LEMONSQUEEZY_WEBHOOK_SECRET) {
          const valid = await verifyLemonSqueezySignature(
            rawBody,
            signature,
            env.LEMONSQUEEZY_WEBHOOK_SECRET
          );
          if (!valid) return json({ error: "firma inválida" }, 401);
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload?.meta?.event_name as string | undefined;
        const licenseId = payload?.meta?.custom_data?.licenseId as string | undefined;
        const featureKey = payload?.meta?.custom_data?.featureKey as string | undefined;
        const subscriptionId = payload?.data?.id as string | undefined;

        if (!licenseId || !featureKey) {
          return json({ error: "custom_data.licenseId y featureKey son requeridos" }, 400);
        }

        const activeEvents = ["subscription_created", "subscription_resumed", "order_created"];
        const cancelEvents = ["subscription_cancelled", "subscription_expired", "subscription_paused"];

        let status: "active" | "cancelled" | "expired" | "past_due" = "active";
        if (eventName && cancelEvents.includes(eventName)) status = "cancelled";
        else if (eventName === "subscription_payment_failed") status = "past_due";
        else if (!eventName || !activeEvents.includes(eventName)) status = "active";

        const existing = await env.DB.prepare(
          `SELECT * FROM entitlements WHERE license_id = ? AND feature_key = ?`
        )
          .bind(licenseId, featureKey)
          .first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE entitlements SET status = ?, external_subscription_id = ?, updated_at = ? WHERE id = ?`
          )
            .bind(status, subscriptionId ?? null, Date.now(), existing.id)
            .run();
        } else {
          await env.DB.prepare(
            `INSERT INTO entitlements (id, license_id, feature_key, status, source, external_subscription_id, purchased_at, updated_at)
             VALUES (?, ?, ?, ?, 'lemonsqueezy', ?, ?, ?)`
          )
            .bind(uuid(), licenseId, featureKey, status, subscriptionId ?? null, Date.now(), Date.now())
            .run();
        }

        return json({ received: true });
      }

      // GET /entitlements/:licenseId
      const entitlementsMatch = path.match(/^\/entitlements\/([a-zA-Z0-9-]+)$/);
      if (entitlementsMatch && method === "GET") {
        const licenseId = entitlementsMatch[1];
        const rows = await env.DB.prepare(
          `SELECT feature_key, status, expires_at FROM entitlements WHERE license_id = ?`
        )
          .bind(licenseId)
          .all();
        return json({ entitlements: rows.results });
      }

      // GET /ads/:platform/report
      const adsReportMatch = path.match(/^\/ads\/([a-z]+)\/report$/);
      if (adsReportMatch && method === "GET") {
        const platform = adsReportMatch[1];
        const licenseId = url.searchParams.get("licenseId");
        const token = request.headers.get("authorization");

        if (!licenseId || !token) {
          return json({ error: "licenseId y Authorization son requeridos" }, 400);
        }

        const entitlement = await env.DB.prepare(
          `SELECT * FROM entitlements WHERE license_id = ? AND feature_key = 'ads_reporting' AND status = 'active'`
        )
          .bind(licenseId)
          .first();

        if (!entitlement) {
          return json({ error: "ads_reporting no activo para esta licencia", locked: true }, 402);
        }

        return json({
          platform,
          note: "Implementar llamada real a la Marketing API correspondiente.",
          data: [],
        });
      }

      return json({ error: "ruta no encontrada" }, 404);
    } catch (err) {
      return json({ error: "error interno", detail: String(err) }, 500);
    }
  },
};
