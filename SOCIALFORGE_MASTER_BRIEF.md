# SOCIALFORGE MASTER BRIEF

**Proyecto:** SocialForge by LaTAM Studios
**Slogan:** Your social media. Your machine. Your data.
**Estado del documento:** v1
**Última actualización:** 2026-09-26

---

# 1. QUÉ ES SOCIALFORGE

SocialForge es una aplicación de gestión de redes sociales orientada principalmente a pequeñas empresas, freelancers y agencias de Latinoamérica.

Su propuesta central es un modelo **local-first**:

> Los datos de trabajo del usuario permanecen en su propio equipo.

SocialForge busca ofrecer funciones comparables a herramientas como Buffer, Hootsuite o Metricool, pero con una arquitectura diferente.

El calendario, publicaciones, cola de publicación y scheduler viven localmente en el equipo del usuario mediante SQLite dentro de la aplicación Tauri.

La nube no debe convertirse en el lugar permanente donde viven las publicaciones del usuario.

## Objetivos principales

* Crear y gestionar publicaciones.
* Administrar contenido multimedia.
* Programar publicaciones localmente.
* Conectar cuentas de redes sociales.
* Publicar mediante las APIs oficiales de cada plataforma.
* Gestionar múltiples cuentas y espacios de trabajo.
* Ofrecer funciones diferenciadas para Free, Pro y Agency.
* Incorporar Content Engine con IA en los planes correspondientes.
* Ofrecer Ads Reporting como add-on independiente.
* Mantener el control de los datos del usuario en su máquina.

## Modelo de negocio

SocialForge se distribuye como una aplicación instalable.

No existe un plan Free basado en una versión cloud de la aplicación.

Los planes comparten la misma aplicación y las diferencias se controlan mediante licencias y entitlements.

### Free

* Funcionamiento local.
* Cuentas limitadas.
* Un workspace.
* Backup/exportación manual.
* Ads Reporting como add-on independiente.
* Sin Content Engine IA.

### Pro

* Funcionamiento local.
* Más cuentas.
* Múltiples workspaces.
* Backup automático.
* Ads Reporting opcional.
* Content Engine.

### Agency

* Todas las cuentas necesarias.
* Múltiples workspaces.
* Equipos.
* Backup automático.
* Ads Reporting incluido.
* Content Engine.

---

# 2. ARQUITECTURA

## Regla arquitectónica principal

**SocialForge es local-first.**

Las publicaciones, calendario, cola y scheduler pertenecen al cliente local.

### SQLite local

SQLite dentro de Tauri almacena:

* workspaces
* cuentas
* publicaciones
* multimedia
* jobs
* settings
* cache local necesaria

Los tokens de acceso de redes sociales **no se almacenan permanentemente en SQLite**.

Se almacenan cifrados mediante el Keychain/Credential Manager del sistema operativo.

## Cloudflare Worker + D1

El Worker es un backend delgado.

Puede encargarse de:

* licencias
* validación de licencias
* OAuth exchange
* secretos OAuth que no deben llegar al cliente
* manifest de actualizaciones
* webhook de Lemon Squeezy
* entitlements
* proxy de Ads Reporting cuando corresponda

El Worker **NO** debe convertirse en el scheduler ni en el publisher de SocialForge.

No se debe crear una tabla de publicaciones programadas en D1 ni un Cron que publique contenido salvo que se tome explícitamente una nueva decisión arquitectónica.

Si una propuesta requiere que las publicaciones del usuario pasen a almacenarse y programarse en la nube, debe identificarse explícitamente como:

> **ESTO CAMBIA EL MODELO DE NEGOCIO HACIA SAAS EN LA NUBE.**

## Fuente de verdad del modelo Post

La definición compartida está en:

`packages/core/src/index.ts`

Debe existir un único modelo `Post`, no múltiples tipos paralelos.

Actualmente:

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

Un post puede dirigirse a múltiples plataformas.

El post pertenece a un `workspace_id` local.

La licencia no es parte del modelo de contenido.

---

# 3. REGLAS PARA CUALQUIER IA

Cualquier IA que trabaje sobre SocialForge debe leer este archivo antes de analizar, modificar o proponer cambios estructurales.

## Antes de modificar

La IA debe:

1. Leer este Master Brief.
2. Inspeccionar el código real del repositorio.
3. Identificar si la funcionalidad propuesta ya existe.
4. Buscar si ya existe una tabla, endpoint, tipo, comando o mecanismo equivalente.
5. Verificar que la propuesta respete la arquitectura local-first.
6. Diferenciar entre:

   * problema real;
   * propuesta de solución;
   * decisión arquitectónica.

Una propuesta de otra IA no debe considerarse correcta simplemente porque resuelva un error de compilación.

## Nuevas tablas, endpoints o tipos

Antes de crear cualquiera de ellos, comprobar si ya existe un equivalente.

No duplicar modelos ni lógica de negocio.

Si la solución propuesta rompe la arquitectura local-first, señalarlo explícitamente antes de implementarla.

## Compilación

Un error de compilación debe solucionarse de acuerdo con la arquitectura existente.

No modificar la arquitectura simplemente para hacer desaparecer un error.

Una solución técnicamente válida pero incompatible con este documento debe considerarse una propuesta de cambio arquitectónico, no una corrección automática.

## Migraciones

Las migraciones SQLite son incrementales y numeradas.

Cada migración debe permanecer como archivo independiente.

No fusionar o reescribir migraciones históricas simplemente para ocultar un problema actual.

Antes de agregar una migración, verificar el estado real de la base y las migraciones existentes.

## OAuth y secretos

Nunca colocar:

* client secrets;
* access tokens;
* refresh tokens;
* API keys;
* credenciales privadas

en este documento ni en código que deba quedar público.

Los secretos deben permanecer en los mecanismos apropiados de configuración segura o Keychain.

## Rol de las IAs

Las IAs pueden:

* analizar;
* proponer;
* implementar;
* revisar;
* detectar inconsistencias.

Pero una IA no debe asumir que una propuesta externa es una decisión arquitectónica.

El Master Brief y el código real son las referencias operativas.

---

## CIERRE OBLIGATORIO DE SESIÓN

Cuando el usuario indique que la sesión termina o solicite el estado para actualizar el Master Brief, entregar un bloque:

`MASTER BRIEF UPDATE`

Debe contener:

* **ESTADO**
* **CAMBIOS REALIZADOS**
* **CONFIRMADO**
* **PENDIENTE**
* **BLOQUEADORES**
* **ARCHIVOS MODIFICADOS**
* **GIT**
* **DECISIONES**
* **PRÓXIMO PASO**

No narrar la conversación.

No inventar resultados.

Si algo no fue comprobado, marcarlo como:

`NO CONFIRMADO`

El objetivo es que el usuario pueda reemplazar directamente el contenido de `SANDBOX` por este bloque.

---

# 4. DECISIONES Y RESTRICCIONES

## Datos

Los datos de contenido pertenecen al usuario y viven localmente.

## Licencias

Las licencias pertenecen al sistema de negocio y son gestionadas por el Worker.

Una licencia no sustituye a `workspace_id`.

## Ads Reporting

Ads Reporting es un add-on independiente.

La tabla `entitlements` en D1 representa el estado del entitlement.

Las APIs de marketing no deben solicitar permisos innecesarios durante el MVP.

## Meta

La integración actual utiliza:

* Facebook Login for Business.
* `config_id`.
* Graph API v26.0.
* OAuth exchange mediante Worker.
* Tokens finales protegidos mediante Keychain.

No utilizar el flujo clásico basado en `scope` para esta integración Business.

## Links

Facebook puede utilizar el campo nativo `link`.

Instagram no dispone de enlaces clicables equivalentes mediante la publicación normal, por lo que el enlace puede incorporarse al caption.

`link_url` forma parte del modelo de publicación.

## Música y stickers

La incorporación mediante edición local y procesamiento multimedia es técnicamente posible, pero representa una funcionalidad adicional importante.

No debe considerarse una modificación menor ni asumirse como parte del MVP hasta tomar una decisión explícita.

## Plataformas

Orden actual:

1. Meta, Facebook + Instagram.
2. TikTok.
3. LinkedIn.
4. X.
5. YouTube.
6. Pinterest.
7. Threads.

TikTok actualmente tiene las restricciones propias de su estado de acceso/auditoría.

LinkedIn requiere el acceso correspondiente de su plataforma.

---

# 5. ESTADO ACTUAL

**Fecha:** 2026-09-26

**Rama principal:** `main`

**Commit actual:**

`0894230 Update SocialForge project`

**GitHub:**

`origin/main`

**Estado Git conocido:**

Working tree limpio y rama sincronizada con `origin/main`.

## Estado del proyecto

La arquitectura base está definida.

El repositorio corregido ya fue integrado en `main`.

La integración OAuth de Meta existe y se encuentra en desarrollo funcional.

La aplicación Tauri utiliza SQLite local.

El Worker existe como backend delgado.

## Situación actual de compilación

El proyecto todavía requiere revisión antes de considerarse estructuralmente estable.

Se detectaron al menos dos puntos que deben investigarse:

### 1. Migración 004

`apps/desktop/src-tauri/src/main.rs` referencia:

`migrations/004_link_url.sql`

El archivo actualmente no está presente en el proyecto corregido.

Importante:

`001_init.sql` ya contiene:

```sql
link_url TEXT
```

Por lo tanto, **NO crear automáticamente una migración 004 que vuelva a ejecutar `ALTER TABLE posts ADD COLUMN link_url TEXT`** sin revisar primero la estrategia correcta de migraciones.

Este punto está pendiente.

### 2. Lifetime de `get_conn`

Actualmente existe:

```rust
fn get_conn(state: &State<DbState>) -> std::sync::MutexGuard<'_, Connection> {
    state.inner().conn.lock().expect("db lock failed")
}
```

Una herramienta externa propuso modificar la firma para introducir lifetimes explícitos.

La propuesta todavía no ha sido aceptada.

Debe verificarse contra el código real, la versión de Tauri y el comportamiento esperado antes de modificarla.

---

# 6. ÁRBOL ACTUAL

```text
socialforge/
├── apps/
│   ├── desktop/
│   │   └── src-tauri/
│   │       ├── migrations/
│   │       │   ├── 001_init.sql
│   │       │   ├── 002_ads_addon.sql
│   │       │   ├── 003_language.sql
│   │       │   └── 005_account_external_id.sql
│   │       ├── src/
│   │       │   └── main.rs
│   │       └── Cargo.toml
│   │
│   └── demo-web/
│
├── packages/
│   └── core/
│       └── src/
│           └── index.ts
│
├── worker/
│   └── ...
│
├── design/
│   └── ...
│
├── docs/
│   └── ...
│
├── .github/
│   └── ...
│
├── README.md
├── meta-config-context.md
├── package.json
└── .gitignore
```

**Nota:** este árbol representa el estado conocido al crear este Master Brief. Debe actualizarse cuando cambie realmente la estructura del repositorio.

---

# 7. SANDBOX

> **Esta sección es reemplazable.**
>
> No es una bitácora histórica.
>
> Contiene únicamente el estado operativo que una IA necesita para continuar el trabajo actual.
>
> Cuando termine una sesión, el usuario puede reemplazar este bloque por el `MASTER BRIEF UPDATE` generado por la IA.

Después:

1. compilar;
2. verificar;
3. corregir;
4. volver a compilar;
5. documentar el resultado en el Sandbox.

---

# PRINCIPIO OPERATIVO

**El Master Brief describe el estado actual.**

**Git conserva la historia.**

**El Sandbox contiene únicamente el trabajo operativo actual.**

**El árbol y el Sandbox son las secciones destinadas a cambiar con frecuencia.**

Todo lo demás debe cambiar únicamente cuando exista una decisión real de arquitectura, producto o proceso.

##SANDBOX:

##SANDBOX:
## ESTADO
Núcleo técnico compilando correctamente en los tres sistemas objetivo.
Se superó el milestone de compilación multiplataforma: GitHub Actions completó
exitosamente los builds de Windows, macOS y Ubuntu.

La siguiente fase ya no es corregir compilación, sino realizar la primera
validación funcional del artefacto Windows.

## CAMBIOS REALIZADOS
- `apps/desktop/src-tauri/src/main.rs`: corregido el lifetime de `get_conn`.
  La firma quedó:
  `fn get_conn<'a>(state: &'a State<'_, DbState>) -> std::sync::MutexGuard<'a, Connection>`
- Cambio confirmado mediante `git diff` y posteriormente commit/push.
- Commit del fix:
  `02b655a Fix database connection lifetime`
- `.github/workflows/build.yml`: mantiene el fix previo que fuerza
  `shell: bash` en el paso de instalación de frontend.
- Se eliminó previamente el workflow redundante `build-desktop.yml`.
- Se generó y descargó correctamente el artefacto Windows desde GitHub Actions.
- Se realizó extracción administrativa del MSI sin instalar SocialForge.

## CONFIRMADO
### GitHub Actions
Los tres jobs del workflow terminaron en verde:
- Windows: CONFIRMADO
- macOS: CONFIRMADO
- Ubuntu 22.04: CONFIRMADO

### Ubuntu
El build produjo correctamente:
- `.deb`
- `.rpm`
- `.AppImage`

El artifact de Ubuntu fue cargado correctamente.

### Windows
Artifact:
`socialforge-windows-latest`

Artifact ID:
`10922008578`

Tamaño aproximado:
`7,755,873 bytes`

El ZIP fue descargado localmente como:
`E:\socialforge-windows-latest.zip`

El ZIP fue extraído a:
`E:\socialforge-test`

Contenido confirmado:
- `release\bundle\msi\SocialForge_0.1.0_x64_en-US.msi`
- `release\bundle\nsis\SocialForge_0.1.0_x64-setup.exe`

Tamaños confirmados:
- MSI: `4,710,400 bytes`
- NSIS: `3,277,129 bytes`

### MSI
Se realizó extracción administrativa mediante `msiexec /a` sin instalar
SocialForge.

Destino:
`E:\socialforge-msi-extracted`

Contenido relevante confirmado:
`E:\socialforge-msi-extracted\PFiles\SocialForge\socialforge.exe`

Ejecutable:
- Tamaño: `12,980,224 bytes`
- FileVersion: `0.1.0`
- ProductVersion: `0.1.0`
- ProductName: `SocialForge`
- FileDescription: `SocialForge`
- CompanyName: `latam`
- Debug: `False`
- PreRelease: `False`

### Firma
El MSI y el instalador NSIS aparecen como:
`Status: NotSigned`

Esto NO se considera un error de compilación ni un bloqueador para
la prueba de desarrollo actual.

### Estado del instalador
El instalador MSI fue iniciado y actualmente muestra el flujo inicial
del instalador con el botón `Next`.

NO SE HA COMPLETADO TODAVÍA LA INSTALACIÓN.

### Laboratorio local
Se están utilizando las siguientes rutas en la unidad `E:` para mantener
los artefactos y pruebas separados del entorno principal:

`E:\socialforge-test`
`E:\socialforge-msi-extracted`

La intención de utilizar `E:` es mantener aislados los artefactos y
facilitar la eliminación/recreación del entorno de prueba.

Esto NO implica que SocialForge sea una aplicación portable ni que todos
sus datos, SQLite o credenciales permanezcan necesariamente en `E:`.

## PENDIENTE
- Completar la primera instalación controlada de SocialForge.
- Determinar si el MSI permite seleccionar una ubicación personalizada
  como `E:\SocialForge-Install`.
- Ejecutar SocialForge por primera vez.
- Verificar que la ventana Tauri/React arranque correctamente.
- Verificar comportamiento de SQLite local.
- Verificar Keychain/Credential Manager de Windows.
- Verificar la interfaz y funcionalidad de Accounts.
- Verificar el flujo OAuth de Meta.
- Verificar conexión de Facebook/Instagram.
- Intentar el primer post real.
- Confirmar funcionalmente `linkUrl` en `packages/core/src/index.ts`.
- Revisar cualquier problema funcional solamente después de ejecutar
  el artefacto real.

## BLOQUEADORES
Ninguno confirmado.

El proyecto ya supera la fase de compilación multiplataforma.

No existe actualmente evidencia que justifique realizar nuevas
modificaciones de código antes de ejecutar el artefacto Windows.

## ARCHIVOS MODIFICADOS
- `apps/desktop/src-tauri/src/main.rs`
  - Fix de lifetime de `get_conn`
- `.github/workflows/build.yml`
  - Fix previo de `shell: bash`
- `build-desktop.yml`
  - Eliminado previamente por ser workflow redundante

No se realizaron modificaciones adicionales al código durante la
validación del artefacto Windows.

## GIT
Rama:
`main`

Commit confirmado:
`02b655a Fix database connection lifetime`

Push confirmado:
`origin/main`

El commit anterior al fix era:
`d716b78`

El cambio enviado fue exactamente una modificación de una línea en
`main.rs`.

## DECISIONES
- No realizar más cambios de código solamente por anticipación.
- La compilación multiplataforma ya está confirmada.
- La siguiente validación debe hacerse sobre el artefacto Windows real.
- Mantener los artefactos de prueba en `E:` durante esta fase.
- No asumir que la aplicación es portable solamente porque puede
  instalarse en una ruta personalizada.
- No instalar Visual Studio ni herramientas adicionales únicamente para
  ejecutar `dumpbin`.
- `NotSigned` se acepta temporalmente durante desarrollo.
- Mantener el MSI y el ejecutable extraído disponibles como referencia
  hasta terminar la primera prueba funcional.
- La prioridad inmediata es:
  instalación → primer arranque → SQLite/Keychain → Accounts →
  Meta OAuth → primer post real.

## PRÓXIMO PASO
1. Continuar el instalador MSI desde la pantalla actual.
2. Verificar si permite seleccionar una ubicación personalizada en `E:`.
3. Instalar SocialForge en el entorno de prueba.
4. Ejecutar la aplicación.
5. Registrar cualquier comportamiento o error real.
6. No modificar código hasta tener evidencia del comportamiento funcional.
7. Si el arranque es correcto, continuar con Accounts y Meta OAuth.