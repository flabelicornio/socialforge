# SocialForge — Brief técnico de arquitectura

Este documento es el contexto completo del producto. Cualquier sugerencia de
código, feature o arquitectura debe respetar estas decisiones — son
intencionales, no descuidos.

---

## 1. Qué es SocialForge

App de gestión de redes sociales **local-first** para pequeños negocios,
freelancers y agencias en LatAm. Marca: "SocialForge by LaTAM Studios".
Eslogan: "Your social media. Your machine. Your data."

Compite con Buffer/Hootsuite/Metricool, pero NO copiando su modelo — el
diferenciador es arquitectura: los datos del usuario viven en su propia
computadora, no permanentemente en nuestra nube.

---

## 2. Regla de oro (la más importante — no romper esto)

> **Los posts, el calendario, la cola de publicación y el scheduler viven
> LOCALMENTE en la máquina del usuario (SQLite dentro de la app Tauri).**
>
> **El backend en Cloudflare (Worker + D1) NO guarda posts, NO tiene cron
> de publicación, y NO es quien dispara las publicaciones.**

Por qué: si el scheduler vive en el Worker, la app deja de ser local-first,
se vuelve un SaaS normal en la nube (como Buffer), pierde su diferenciador
de privacidad/ownership, y empieza a costar dinero de Cloudflare por cada
post procesado. Eso NO es lo que queremos.

El Worker existe solo para:
- Licencias (activar, validar)
- Intercambio OAuth (porque ahí vive el `client_secret`, nunca en el cliente)
- Manifest de actualizaciones (auto-updater de Tauri)
- Webhook de Lemon Squeezy (add-ons pagados)
- Proxy de reportes de Ads (fase futura, requiere entitlement pagado)

**Cualquier sugerencia que agregue una tabla de posts programados en D1, o
un Cron trigger que publique contenido, contradice la arquitectura y debe
rechazarse o replantearse — a menos que se esté discutiendo explícitamente
cambiar el modelo de negocio completo (no es el caso).**

---

## 3. Modelo de datos (fuente de verdad: `packages/core/src/index.ts`)

Un solo tipo `Post` (no crear tipos paralelos como `ScheduledPost`):

```ts
export interface Post {
  id: string;
  text: string;
  mediaIds: string[];
  platforms: SocialPlatform[];
  scheduledFor: number | null;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  failureReason?: string;
}
```

- Un post puede tener **varios `platforms`** (multi-red) — no hace falta un
  campo `pageId` único, un post ya soporta llegar a varias Páginas/redes.
- La cola soporta múltiples posts el mismo día sin ningún cambio adicional
  — la tabla local `jobs` ya permite N filas con distinto `run_at`.
- `Post` vive ligado a un `workspace_id` (local), NO a un `licenseId`. La
  licencia es un concepto del Worker/facturación, no debe mezclarse con el
  modelo de contenido.

---

## 4. Free vs. Pro vs. Agency — qué cambia realmente

**Los tres planes usan la MISMA app instalable local-first.** No hay una
versión "gratis en la nube" — eso se descartó explícitamente. Los planes
se diferencian por **feature-gating dentro de la misma app**, verificado
contra la licencia:

| | Free | Pro | Agency |
|---|---|---|---|
| Dónde corre | Local (Tauri) | Local (Tauri) | Local (Tauri) |
| Cuentas conectadas | Limitado | Más | Todas |
| Workspaces | 1 | Varios | Varios + equipos |
| Backup/export | Manual | Automático | Automático |
| Ads Reporting | ❌ (add-on pagado aparte) | Opcional (add-on) | Incluido |
| Content Engine (IA) | ❌ | ✓ | ✓ |

También existe un **demo desechable en navegador** (`apps/demo-web`) —
pero es solo un gancho de marketing sin backend real, datos en
`localStorage`, publicación simulada. No es un "plan gratis" de producción,
es una demo que se pierde al limpiar caché a propósito.

---

## 5. Add-on de Ads Reporting (fase futura, ya con schema listo)

Reportar métricas de Meta Ads/Google Ads/TikTok Ads es un **add-on pagado
aparte**, vía Lemon Squeezy, desacoplado del plan base (tabla
`entitlements` en D1, independiente de `licenses`). El panel se ve siempre
en la UI pero bloqueado hasta que se activa el entitlement. Esto SÍ
requiere permisos de Marketing API (`ads_management`, `ads_read`) que HOY
NO están pedidos — se agregan cuando se construya esta fase, no antes.

---

## 6. OAuth de Meta — cómo está implementado hoy (funcionando)

- App tipo **Business**, con **Facebook Login for Business**.
- Se usa **`config_id`** (Configuration creada en el dashboard), **nunca
  `scope`** en la URL de autorización — las apps Business no soportan ese
  flujo clásico.
- Graph API version actual en uso: **v26.0**.
- Permisos configurados: `business_management`, `pages_show_list`,
  `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
  `instagram_content_publish`.
- Flujo: `/oauth/facebook/start` (redirige a Meta) → usuario autoriza →
  `/oauth/facebook/callback` (intercambia code por token, extiende a 60
  días, trae Páginas + cuenta de Instagram ligada) → guarda el resultado
  **temporalmente** en D1 (columna `result_json` de `oauth_exchanges`) →
  la app desktop hace polling a `/oauth/facebook/result`, lo recoge UNA
  vez, y el token se borra del servidor — el token final vive cifrado en
  el Keychain/Credential Manager del sistema operativo del usuario, NUNCA
  permanece en D1 a largo plazo.
- Modo actual: **Standard Access** (Development) — funciona solo con
  cuentas/Páginas de personas con un rol en la app (el propio desarrollador
  probando). Advanced Access + App Review es necesario únicamente para
  conectar cuentas de clientes reales — eso es una fase posterior, no
  bloquea el desarrollo actual.

---

## 7. Links, música y stickers (decisión pendiente de confirmar, no implementado aún)

- **Links**: Facebook los soporta nativo en el post (`link` field en
  `/{page-id}/feed`). Instagram no soporta links clickeables vía API — la
  convención es agregarlo al final del caption. Esto SÍ se va a agregar
  como campo opcional en `Post` (no como tipo nuevo).
- **Música/stickers "quemados" en el video/imagen antes de subir**: es
  técnicamente posible (editor + ffmpeg.wasm en el cliente), pero es una
  **feature nueva de scope grande**, no un ajuste menor — está en
  evaluación, no confirmada para el MVP actual. No asumir que ya se va a
  construir sin que el equipo lo confirme explícitamente.

---

## 8. Otras plataformas — estado y orden

- **Meta (FB/IG)**: en desarrollo activo, OAuth funcionando (ver sección 6).
- **TikTok**: registrar cuando el resto esté estable. Nota importante: sin
  pasar la auditoría de Content Posting API, los posts solo pueden salir
  como privados (`SELF_ONLY`), tope 5 usuarios/24h.
- **LinkedIn**: requiere aprobación de partnership del Marketing Developer
  Platform — históricamente difícil para apps chicas. Evaluar más adelante.
- **X (Twitter)**: pendiente, sin prisa, se agrega después.
- **YouTube, Pinterest, Threads**: no iniciados.

---

## 9. Estructura del repo (monorepo)

```
socialforge/
├── apps/desktop/       ← app real, Tauri + React + SQLite local
├── apps/demo-web/      ← demo desechable, sin backend real
├── packages/core/      ← tipos y lógica compartida (Post, i18n, etc.)
└── worker/             ← backend delgado: licencias, OAuth, updates, webhooks
```

- No crear archivos ni carpetas nuevas fuera de esta estructura sin
  confirmar antes en qué capa deben vivir (local vs. Worker).
- El Worker (`worker/src/index.ts`) ya tiene: licencias, OAuth de Facebook,
  webhook de Lemon Squeezy, entitlements, proxy de Ads (placeholder). No
  duplicar lógica de negocio ahí que debería vivir en el cliente.

---

## 10. Idioma y marca

- UI en **español por default** (mercado LatAm), con selector a inglés.
- El nombre de marca "SocialForge" se mantiene en inglés (decisión ya
  tomada, no es un descuido).

---

## Regla para cualquier IA que colabore en este proyecto

Antes de proponer una tabla nueva, un endpoint nuevo, o un tipo de dato
nuevo: verificar contra este documento si ya existe algo equivalente, y si
la propuesta mantiene el principio de la sección 2 (local-first, Worker
delgado). Si una sugerencia requiere romper esa regla, decirlo
explícitamente como "esto cambia el modelo de negocio hacia SaaS en la
nube" en vez de presentarlo como un ajuste técnico menor.
