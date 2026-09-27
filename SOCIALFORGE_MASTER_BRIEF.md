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

***Aqui voy a pegar todo el ultimo mensaje de cada actualizacion a pesar de la interpretacion de la ia por "actualizar el brief" para que podamos comparar con la estructura total****:


Sí, tienes toda la razón. 😄 Estamos haciendo demasiada cirugía por partes para algo que originalmente era simplemente **actualizar el estado del Brief**.

Hagámoslo limpio: **desde la línea 324 hasta el final**, reemplaza todo por este bloque completo. Así no hay riesgo de dejar pedazos del estado anterior mezclados con el nuevo.

````text
## ESTADO ACTUAL

**Commit actual:**

`02b655a Fix database connection lifetime`

**GitHub:**

`origin/main`

**Estado Git conocido:**

La rama `main` contiene el fix de lifetime y el build multiplataforma
posterior confirmó que el proyecto compila correctamente en los tres
sistemas objetivo.

## Situación del proyecto

La arquitectura base está definida y el proyecto ha superado el milestone
de compilación multiplataforma.

La aplicación Tauri utiliza SQLite local.

El Worker existe como backend delgado.

La integración OAuth de Meta existe y se encuentra en desarrollo funcional.

La siguiente fase ya no es resolver problemas de compilación, sino validar
el comportamiento real de la aplicación Windows.

## Compilación multiplataforma

GitHub Actions confirmó correctamente los siguientes targets:

- Windows
- macOS
- Ubuntu 22.04

Los tres jobs terminaron en verde.

### Ubuntu

El build produjo correctamente:

- `.deb`
- `.rpm`
- `.AppImage`

El artifact correspondiente fue cargado correctamente.

### Windows

Se generó correctamente el artifact:

`socialforge-windows-latest`

Artifact ID:

`10922008578`

El artifact fue descargado localmente como:

`E:\socialforge-windows-latest.zip`

El ZIP fue extraído en:

`E:\socialforge-test`

Contenido confirmado:

`E:\socialforge-test\release\bundle\msi\SocialForge_0.1.0_x64_en-US.msi`

`E:\socialforge-test\release\bundle\nsis\SocialForge_0.1.0_x64-setup.exe`

Tamaños confirmados:

- MSI: `4,710,400 bytes`
- NSIS: `3,277,129 bytes`

## MSI y ejecutable Windows

Se realizó una extracción administrativa del MSI mediante `msiexec /a`
sin instalar todavía SocialForge.

Destino:

`E:\socialforge-msi-extracted`

El ejecutable fue encontrado en:

`E:\socialforge-msi-extracted\PFiles\SocialForge\socialforge.exe`

Características confirmadas:

- Tamaño: `12,980,224 bytes`
- FileVersion: `0.1.0`
- ProductVersion: `0.1.0`
- ProductName: `SocialForge`
- FileDescription: `SocialForge`
- CompanyName: `latam`
- Debug: `False`
- PreRelease: `False`

Esto confirma que el bundle Windows contiene un ejecutable real de
SocialForge y que el MSI puede ser procesado correctamente.

## Firma digital

El MSI y el instalador NSIS aparecen como:

`Status: NotSigned`

Esto no constituye un error de compilación y no bloquea la validación
local durante desarrollo.

La firma de código se considera una tarea posterior para distribución
pública.

## Fix de base de datos

El error de compilación relacionado con el lifetime de `get_conn` fue
corregido en:

`apps/desktop/src-tauri/src/main.rs`

La firma actual es:

```rust
fn get_conn<'a>(state: &'a State<'_, DbState>) -> std::sync::MutexGuard<'a, Connection>
````

El cambio fue incluido en:

`02b655a Fix database connection lifetime`

El build posterior confirmó que este problema quedó resuelto.

## Migraciones

La migración:

`004_link_url.sql`

existe en el repositorio.

No crear otra migración duplicada para `link_url` sin revisar primero
el estado real de las migraciones.

## Workflow de build

`.github/workflows/build.yml` mantiene el fix previo que fuerza:

`shell: bash`

en el paso de instalación de dependencias frontend.

El workflow redundante:

`build-desktop.yml`

fue eliminado previamente.

El workflow principal de build es el que produjo los artifacts
multiplataforma confirmados.

## Laboratorio local

Durante esta etapa se están utilizando las siguientes rutas:

`E:\socialforge-test`

`E:\socialforge-msi-extracted`

La intención es mantener los artifacts y las pruebas separados del
entorno principal y facilitar su eliminación o recreación.

Esto NO implica que SocialForge sea una aplicación portable ni que
SQLite, configuración o credenciales permanezcan necesariamente en `E:`.

## Instalador

El instalador MSI fue abierto y actualmente muestra el flujo inicial
del instalador con el botón `Next`.

La instalación todavía NO ha sido completada.

Se decidió continuar la prueba utilizando `E:` como entorno de laboratorio
para reducir el impacto sobre el sistema principal.

## PENDIENTE

### Primera validación funcional de Windows

* Continuar el instalador MSI.
* Determinar si permite seleccionar una ubicación personalizada en `E:`.
* Instalar SocialForge en el entorno de prueba.
* Ejecutar SocialForge por primera vez.
* Verificar que la ventana Tauri/React arranque correctamente.
* Verificar SQLite local.
* Verificar Keychain/Credential Manager de Windows.
* Verificar la pantalla de Accounts.
* Verificar el flujo OAuth de Meta.
* Verificar conexión de Facebook e Instagram.
* Intentar el primer post real.
* Confirmar funcionalmente `linkUrl` en `packages/core/src/index.ts`.

## BLOQUEADORES

Ninguno confirmado.

La compilación multiplataforma ya está confirmada.

No realizar nuevas modificaciones de código solamente por anticipación.

Primero ejecutar el artefacto real y diagnosticar cualquier problema
funcional observado.

## DECISIONES ACTUALES

* No modificar código solamente por anticipación.
* La compilación de Windows, macOS y Ubuntu está confirmada.
* La siguiente validación debe hacerse sobre el artefacto Windows real.
* Mantener los artifacts de prueba en `E:` durante esta fase.
* No asumir que SocialForge es portable solamente porque pueda instalarse
  en una ruta personalizada.
* No instalar Visual Studio únicamente para obtener `dumpbin`.
* `NotSigned` se acepta temporalmente durante desarrollo.
* Mantener el MSI y el ejecutable extraído como referencia hasta terminar
  la primera prueba funcional.
* No borrar todavía `E:\socialforge-test` ni
  `E:\socialforge-msi-extracted`.
* No cambiar arquitectura antes de completar la primera prueba funcional.

## GIT

Rama:

`main`

Commit actual:

`02b655a Fix database connection lifetime`

Push a:

`origin/main`

confirmado.

## ARCHIVOS Y CAMBIOS RELEVANTES

### `apps/desktop/src-tauri/src/main.rs`

Fix de lifetime de `get_conn`.

### `.github/workflows/build.yml`

Fix previo de `shell: bash` para el paso de instalación de frontend.

### `build-desktop.yml`

Workflow redundante eliminado previamente.

### `004_link_url.sql`

Migración existente para `link_url`.

## PRÓXIMO PASO

El siguiente paso no es otro build.

Es:

```text
MSI
 ↓
instalación controlada
 ↓
primer arranque
 ↓
Tauri / React
 ↓
SQLite
 ↓
Keychain / Credential Manager
 ↓
Accounts
 ↓
Meta OAuth
 ↓
Facebook / Instagram
 ↓
primer post real
```

No modificar código hasta observar el comportamiento real del artefacto.

## SANDBOX

### ESTADO

SocialForge superó el milestone de compilación multiplataforma.

GitHub Actions completó correctamente los builds de:

* Windows
* macOS
* Ubuntu 22.04

La siguiente fase es la primera validación funcional del artefacto Windows.

### ARTEFACTOS WINDOWS

ZIP:

`E:\socialforge-windows-latest.zip`

Extracción:

`E:\socialforge-test`

MSI:

`E:\socialforge-test\release\bundle\msi\SocialForge_0.1.0_x64_en-US.msi`

NSIS:

`E:\socialforge-test\release\bundle\nsis\SocialForge_0.1.0_x64-setup.exe`

MSI extraído administrativamente:

`E:\socialforge-msi-extracted`

Ejecutable:

`E:\socialforge-msi-extracted\PFiles\SocialForge\socialforge.exe`

### VALIDACIÓN REALIZADA

* ZIP descargado correctamente.
* ZIP extraído correctamente.
* MSI localizado correctamente.
* NSIS localizado correctamente.
* MSI procesado mediante extracción administrativa.
* Ejecutable `socialforge.exe` localizado.
* Metadatos de versión confirmados.
* Firma digital comprobada como `NotSigned`.
* No se ha completado todavía la instalación.
* No se ha realizado todavía el primer arranque.

### OBJETIVO INMEDIATO

Completar la instalación de Windows en el entorno de laboratorio,
preferentemente en `E:` si el instalador permite seleccionar una ruta
personalizada.

Después:

1. Primer arranque.
2. Diagnóstico de Tauri/React.
3. Diagnóstico de SQLite.
4. Diagnóstico de credenciales.
5. Accounts.
6. Meta OAuth.
7. Primer post real.

### REGLA DE TRABAJO

No volver a modificar código hasta que exista evidencia de un problema
en la ejecución real.

El build ya está verde.

Ahora hay que arrancar el programa.

```

**Ese bloque completo reemplaza desde la línea 324 hasta el final.** No pegues nada debajo de él.

Y sí, esta vez creo que ya podemos dejar de practicarle cirugía al pobre Brief. 😂

Después de pegarlo, commit/push, y **no necesitamos revisar otra vez el documento aquí**. El siguiente chat puede tomar ese archivo como fotografía oficial del proyecto y continuar exactamente desde el instalador. 🏁
```
