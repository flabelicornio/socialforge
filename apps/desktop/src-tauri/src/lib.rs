mod facebook;

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: i64,
    pub platform: String,
    pub account_name: String,
    pub account_id: String,
    pub access_token: String,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthUrlResponse {
    pub auth_url: String,
}

pub struct AppState {
    pub db: Mutex<Connection>,
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("SocialForge");
    fs::create_dir_all(&path).ok();
    path.push("socialforge.db");
    path
}

fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            scheduled_at TEXT,
            status TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            account_name TEXT NOT NULL,
            account_id TEXT NOT NULL UNIQUE,
            access_token TEXT NOT NULL,
            expires_at INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    Ok(())
}

#[tauri::command]
fn get_facebook_auth_url() -> AuthUrlResponse {
    AuthUrlResponse {
        auth_url: facebook::get_facebook_auth_url(),
    }
}

#[tauri::command]
async fn save_facebook_token(
    user_access_token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Account>, String> {
    let pages = facebook::fetch_user_pages(&user_access_token).await?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    for page in &pages {
        conn.execute(
            "INSERT INTO accounts (platform, account_name, account_id, access_token)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(account_id) DO UPDATE SET
                account_name = excluded.account_name,
                access_token = excluded.access_token",
            params!["facebook", page.name, page.id, page.access_token],
        )
        .map_err(|e| format!("Error guardando cuenta en SQLite: {}", e))?;
    }

    get_connected_accounts_internal(&conn)
}

#[tauri::command]
fn get_connected_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_connected_accounts_internal(&conn)
}

fn get_connected_accounts_internal(conn: &Connection) -> Result<Vec<Account>, String> {
    let mut stmt = conn
        .prepare("SELECT id, platform, account_name, account_id, access_token, expires_at FROM accounts")
        .map_err(|e| e.to_string())?;

    let accounts_iter = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                platform: row.get(1)?,
                account_name: row.get(2)?,
                account_id: row.get(3)?,
                access_token: row.get(4)?,
                expires_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut accounts = Vec::new();
    for acc in accounts_iter {
        accounts.push(acc.map_err(|e| e.to_string())?);
    }
    Ok(accounts)
}

#[tauri::command]
async fn publish_post(
    account_id: String,
    message: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let (access_token, platform) = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT access_token, platform FROM accounts WHERE account_id = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query(params![account_id])
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let token: String = row.get(0).map_err(|e| e.to_string())?;
            let plat: String = row.get(1).map_err(|e| e.to_string())?;
            (token, plat)
        } else {
            return Err("Cuenta no encontrada en la base de datos local".to_string());
        }
    };

    if platform == "facebook" {
        let post_id = facebook::publish_to_facebook_page(&account_id, &access_token, &message).await?;
        
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO posts (content, status) VALUES (?1, ?2)",
            params![message, "published"],
        )
        .ok();

        Ok(post_id)
    } else {
        Err("Plataforma no soportada para publicación inmediata".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).expect("No se pudo abrir la base de datos SQLite");
    init_db(&conn).expect("Error al inicializar las tablas de SQLite");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            get_facebook_auth_url,
            save_facebook_token,
            get_connected_accounts,
            publish_post
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}