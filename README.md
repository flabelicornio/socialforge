# SocialForge by LaTAM Studios

> Your social media. Your machine. Your data.

Este repo contiene:

- `apps/desktop` — la app de escritorio (Tauri + React). Producto principal.
- `apps/demo-web` — demo desechable en navegador (gancho de adquisición, no persiste datos).
- `packages/core` — tipos y modelo de datos compartido entre ambas apps.
- `worker` — el backend en Cloudflare Workers (licencias, OAuth, updates).

---

## 1. Subir esto a GitHub (sin usar consola)

1. Ve a [github.com/new](https://github.com/new) y crea un repositorio nuevo, por ejemplo `socialforge`. Puede ser privado.
2. En la página del repo recién creado, busca el enlace **"uploading an existing file"**.
3. Arrastra TODA esta carpeta (`socialforge/`) — GitHub la sube manteniendo la estructura de subcarpetas.
4. Dale "Commit changes". Listo, ya está en git.

Alternativa más cómoda para el día a día: instala **GitHub Desktop** (tiene interfaz gráfica, cero consola), ahí conectas esta carpeta como repositorio local y le das "Publish" y luego "Commit"/"Push" cada vez que yo te dé archivos nuevos.

---

## 2. Configurar el Worker (Cloudflare) — paso a paso desde el panel

1. Crea una cuenta en [dash.cloudflare.com](https://dash.cloudflare.com) si no tienes.
2. En el menú lateral: **Workers & Pages → Create → Workers**. Conecta este repositorio de GitHub y apunta el "root directory" a `worker/`.
3. Ve a **Workers & Pages → D1 → Create database**. Llámala `socialforge-db`.
4. Abre la base recién creada → pestaña **Console** → pega el contenido completo de `worker/schema.sql` y ejecútalo. Esto crea las tablas.
5. Copia el **Database ID** que te muestra Cloudflare (aparece en la misma pantalla de la base D1).
6. Edita el archivo `worker/wrangler.toml` en este repo (puedes editarlo directo en la web de GitHub, con el lápiz ✏️) y reemplaza `PENDIENTE_DATABASE_ID` por el ID real.
7. En el Worker que creaste (paso 2) → **Settings → Variables** → agrega como "Secret" (no como texto plano) las claves que necesites, por ejemplo `INSTAGRAM_CLIENT_SECRET`, conforme vayas registrando cada app en el developer portal de cada red social.
8. Cada vez que subas cambios a la carpeta `worker/` en la rama `main`, el archivo `.github/workflows/deploy-worker.yml` lo despliega solo — pero antes necesitas configurar dos "Secrets" en GitHub (ver paso 4 abajo).

---

## 3. Conectar GitHub con Cloudflare (para el deploy automático)

1. En Cloudflare: **My Profile → API Tokens → Create Token** → usa la plantilla "Edit Cloudflare Workers". Copia el token.
2. En GitHub, dentro del repo: **Settings → Secrets and variables → Actions → New repository secret**.
   - Crea `CLOUDFLARE_API_TOKEN` con el token del paso anterior.
   - Crea `CLOUDFLARE_ACCOUNT_ID` con tu Account ID (lo ves en el panel principal de Cloudflare, columna derecha).

---

## 4. Compilar la app de escritorio (sin instalar nada en tu compu)

El archivo `.github/workflows/build-desktop.yml` ya está listo para compilar Windows, Mac y Linux en la nube usando GitHub Actions.

1. Ve a la pestaña **Actions** de tu repo en GitHub.
2. Elige "Build Desktop App" → botón **Run workflow**.
3. Espera a que termine (puede tardar 10-20 min, compila Rust).
4. Al terminar, en esa misma ejecución vas a ver los instaladores listos para descargar como "artifacts".

---

## Conectar Meta (Facebook + Instagram) — modo desarrollo, sin esperar revisión

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → Create App → tipo "Business".
2. En "Casos de uso", selecciona **"Administración de contenido"** (NO "Autenticar con inicio de sesión con Facebook" — esa es la versión de consumo, incompatible con lo que necesitamos). Esto activa **Facebook Login for Business** automáticamente.
3. Settings → Basic: copia **App ID** y **App Secret**.
4. Menú izquierdo → **Facebook Login for Business → Configurations → Create configuration**. Selecciona los permisos: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. Guarda y copia el **Configuration ID**.
5. Facebook Login for Business → Settings → Valid OAuth Redirect URIs, agrega:
   `https://TU-WORKER.workers.dev/oauth/facebook/callback`
6. App Roles → Roles: confirma que estás como Admin (ya deberías estarlo).
7. En `worker/wrangler.toml`, reemplaza `PENDIENTE_TU_APP_ID` y `PENDIENTE_TU_CONFIG_ID` con los valores reales.
8. En Cloudflare Worker → Settings → Variables, agrega `FACEBOOK_CLIENT_SECRET` como **Secret** con el App Secret.
9. Corre `worker/schema_oauth_results.sql` en la consola D1 (además de los otros dos schemas).

Con esto puedes publicar en tus propias Páginas/cuentas de Instagram sin esperar
App Review — eso solo hace falta cuando conectes cuentas de clientes reales
(Advanced Access).

---

## Ads Reporting (add-on pagado, fase 2)

Los clientes ven el panel de Ads siempre, pero bloqueado hasta que pagan un
add-on adicional (vía Lemon Squeezy). Cuando conectes esto:

1. En Lemon Squeezy, crea el producto "Ads Reporting" (suscripción mensual).
2. En la configuración del checkout, agrega **custom data**: `licenseId` y
   `featureKey` (usa el valor `ads_reporting`) — así el webhook sabe a quién
   activarle el acceso.
3. En Lemon Squeezy → Settings → Webhooks → agrega la URL de tu Worker:
   `https://TU-WORKER.workers.dev/webhooks/lemonsqueezy`, y copia el
   "Signing secret".
4. En GitHub Secrets / Cloudflare Worker Variables, agrega
   `LEMONSQUEEZY_WEBHOOK_SECRET` con ese valor.
5. Aún falta conectar la llamada real a cada Marketing API (Meta, Google
   Ads, TikTok) dentro de `/ads/:platform/report` en `worker/src/index.ts`
   — por ahora responde con datos vacíos de prueba.

Cada red social de Ads requiere su propio proceso de aprobación (App Review
de Meta, verificación de marca de Google Ads, revisión de scopes de TikTok)
— por eso se deja para después de que el core de publicación esté estable.

---

## Estado actual (MVP en construcción)

- [x] Estructura del repo y monorepo
- [x] Modelo de datos compartido (`packages/core`)
- [x] Schema SQLite local (posts, jobs, accounts, media, settings)
- [x] Schema D1 del Worker (licencias, OAuth, updates)
- [x] Rutas base del Worker
- [x] Demo web desechable (Composer + Queue simulada)
- [ ] Comandos Tauri reales (`list_posts`, `create_post`, etc.) conectando React ↔ SQLite
- [ ] Scheduler local (revisa `jobs` pendientes y los procesa)
- [ ] Conectores reales por red social (Instagram, Facebook, etc.)
- [ ] Guardado seguro de tokens en Keychain/Credential Manager
- [ ] Pantallas: Calendar, Media Library, Accounts, Settings
- [ ] Backup/export `.sfbackup`
- [x] Schema de entitlements (add-ons pagados) + webhook de Lemon Squeezy
- [x] Schema local de Ads Reporting (cuentas + cache de reportes)
- [ ] Panel de Ads Reporting en la UI (bloqueado/desbloqueado según entitlement)
- [ ] Conexión real a Marketing API de Meta (primera red de Ads a activar)
