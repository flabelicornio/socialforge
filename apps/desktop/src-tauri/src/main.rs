#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Vec<String>,
    pub scheduled_for: Option<i64>,
    pub link_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: String,
    pub workspace_id: String,
    pub text: String,
    pub platforms: String,
    pub media_ids: String,
    pub scheduled_for: Option<i64>,
    pub status: String,
    pub failure_reason: Option<String>,
    pub link_url: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos de la app");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("socialforge.db")
}

fn get_media_dir(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos de la app");
    let media_dir = app_dir.join("media");
    fs::create_dir_all(&media_dir).ok();
    media_dir
}

fn init_db(app: &AppHandle) -> SqliteResult<()> {
    let db_path = get_db_path(app);
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            text TEXT NOT NULL,
            platforms TEXT NOT NULL,
            media_ids TEXT NOT NULL,
            scheduled_for INTEGER,
            status TEXT NOT NULL,
            failure_reason TEXT,
            link_url TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(())
}

#[tauri::command]
fn create_post(app: AppHandle, input: CreatePostInput) -> Result<String, String> {
    let db_path = get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_ids_json = serde_json::to_string(&input.media_ids).unwrap_or_default();

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            input.workspace_id,
            input.text,
            platforms_json,
            media_ids_json,
            input.scheduled_for,
            "READY_FOR_USER",
            None::<String>,
            input.link_url,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
fn list_posts(app: AppHandle, workspace_id: String) -> Result<Vec<Post>, String> {
    let db_path = get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at FROM posts WHERE workspace_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let posts = stmt
        .query_map(params![workspace_id], |row| {
            Ok(Post {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                text: row.get(2)?,
                platforms: row.get(3)?,
                media_ids: row.get(4)?,
                scheduled_for: row.get(5)?,
                status: row.get(6)?,
                failure_reason: row.get(7)?,
                link_url: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(posts)
}

#[tauri::command]
fn delete_post(app: AppHandle, id: String) -> Result<(), String> {
    let db_path = get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM posts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn save_media_file(app: AppHandle, file_name: String, file_bytes: Vec<u8>) -> Result<String, String> {
    let media_dir = get_media_dir(&app);
    let media_id = format!("{}_{}", uuid::Uuid::new_v4(), file_name);
    let file_path = media_dir.join(&media_id);

    fs::write(&file_path, file_bytes).map_err(|e| e.to_string())?;

    Ok(media_id)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            init_db(app.handle())?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![create_post, list_posts, delete_post, save_media_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}