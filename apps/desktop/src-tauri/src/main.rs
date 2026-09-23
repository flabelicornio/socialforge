// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "ads_addon",
            sql: include_str!("../migrations/002_ads_addon.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "language_setting",
            sql: include_str!("../migrations/003_language.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:socialforge.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error corriendo la aplicación SocialForge");
}

// TODO próximos comandos Tauri a implementar aquí (o en módulos separados):
//   - list_posts / create_post / update_post / delete_post
//   - list_accounts / connect_account (guarda token en Keychain vía plugin de OS)
//   - scheduler: loop que revisa `jobs` con run_at <= now() y status PENDING/RETRY
