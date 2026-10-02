Hola, vamos a continuar con el desarrollo de SocialForge desde un entorno limpio.
A continuación te presento la síntesis técnica completa y detallada del proyecto:

---

### 1. Ficha General del Proyecto
* **Nombre:** SocialForge
* **Arquitectura:** Desktop Local-First (Monorepo pnpm)
* **Tech Stack:**
  * **Frontend:** React + Vite + TypeScript + Tailwind CSS
  * **Desktop Core:** Tauri v2 + Rust
  * **Persistencia:** SQLite local (`rusqlite`) almacenado en directorio de datos del usuario (`dirs`)
  * **CI/CD:** GitHub Actions (Build automático de instaladores de Windows `.msi` / `.exe`)
* **Meta App Configuration:**
  * App ID: `1245604221092071`
  * Redirección / Callback: `https://socialforge.latamstudios.com/oauth/facebook/callback`

---

### 2. Estructura Exacta del Monorepo

socialforge/
├── .github/
│   └── workflows/
│       └── build.yml               # CI/CD para Windows con upload-artifact v4
├── packages/
│   └── core/
│       └── package.json            # Librería compartida (@socialforge/core, workspace:*)
├── apps/
│   ├── demo-web/
│   │   └── package.json            # App Web de demostración
│   └── desktop/
│       ├── package.json            # Dependencias React + Tauri v2.0.0 exacto
│       ├── tsconfig.json           # Configuración TS sin emit
│       ├── src/
│       │   ├── App.tsx             # Layout principal del dashboard
│       │   └── components/
│       │       └── SocialAccountsModal.tsx  # UI de conexión OAuth (React -> Tauri invoke)
│       └── src-tauri/
│           ├── Cargo.toml          # Dependencias Rust (tauri, rusqlite, reqwest, urlencoding, dirs, serde)
│           ├── tauri.conf.json     # Configuración nativa de Tauri v2
│           ├── icons/              # Iconos del sistema (32x32.png, 128x128.png, icon.ico, icon.icns)
│           └── src/
│               ├── main.rs         # Punto de entrada de la aplicación Rust
│               ├── lib.rs          # Inicialización de SQLite, manejo de estado y comandos Tauri
│               └── facebook.rs     # Módulo con lógica Graph API de Meta v26.0

---

### 3. Estado Físico y Contenido de Archivos Clave

#### A. `apps/desktop/src-tauri/Cargo.toml`
* Dependencias registradas y probadas:
  * `tauri = "2.0.0"`
  * `tauri-plugin-opener = "2.0.0"`
  * `serde = { version = "1.0", features = ["derive"] }`
  * `serde_json = "1.0"`
  * `rusqlite = { version = "0.31.0", features = ["bundled"] }`
  * `reqwest = { version = "0.12", features = ["json"] }`
  * `urlencoding = "2.1.3"`
  * `dirs = "5.0"`

#### B. `apps/desktop/src-tauri/src/facebook.rs`
* **`get_facebook_auth_url()`**: Genera la URL de OAuth de Meta con permisos `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
* **`publish_to_facebook_page(page_id: &str, access_token: &str, message: &str)`**: Realiza la petición POST a `https://graph.facebook.com/v26.0/{page_id}/feed` retornando el ID de la publicación.

#### C. `apps/desktop/src-tauri/src/lib.rs`
* Base de Datos SQLite: Inicializa la BD `socialforge.db` dentro de `dirs::data_dir()`.
* Tabla `posts`: `id`, `content`, `scheduled_at`, `status`, `created_at`.
* Comandos Tauri expuestos a la interfaz (`#[tauri::command]`):
  * `get_facebook_auth_url`
  * `publish_to_facebook_page`
  * Métodos de lectura y guardado local en SQLite.

#### D. `apps/desktop/src/components/SocialAccountsModal.tsx`
* Botón de "Conectar" Facebook que llama a `invoke<{ auth_url: string }>('get_facebook_auth_url')`.
* Ejecuta `window.open(res.auth_url, '_blank')` para abrir la autenticación en el navegador por defecto.

#### E. `.github/workflows/build.yml`
* Configurado para Windows (`windows-latest`).
* Utiliza Node 20, pnpm 9 y `tauri-action@v0`.
* Sube los binarios `.msi` y `.exe` como **Artifacts** mediante `actions/upload-artifact@v4` desde `apps/desktop/src-tauri/target/release/bundle/`.

---

### 4. Estado Actual del Sistema y Siguiente Paso
1. **Estado:** La compilación CI/CD y local están 100% en verde. Los archivos del proyecto están sincronizados y validados.
2. **Siguiente Objetivo Técnico:**
   * Implementar la recepción del Callback OAuth de Meta (manejo de token de autorización devuelto al navegador/redirección).
   * Crear la tabla `accounts` en SQLite (`id`, `platform`, `account_name`, `access_token`, `expires_at`).
   * Almacenar las credenciales obtenidas y conectar el flujo de "Publicar ahora" del Editor con la API Graph de Meta.

Por favor, confirma que tienes la radiografía completa y procedemos con el siguiente objetivo.