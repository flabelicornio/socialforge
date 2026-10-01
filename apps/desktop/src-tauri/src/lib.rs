mod facebook;

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    pub id: String,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    pub text: String,
    pub platforms: String,
    #[serde(rename = "mediaIds")]
    pub media_ids: String,
    #[serde(rename = "scheduledFor")]
    pub scheduled_for: Option<i64>,
    pub status: String,
    #[serde(rename = "failureReason")]
    pub failure_reason: Option<String>,
    #[serde(rename = "linkUrl")]
    pub link_url: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreatePostInput {
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    #[serde(rename = "mediaIds")]
    pub media_ids: Vec<String>,
    #[serde(rename = "scheduledFor")]
    pub scheduled_for: Option<i64>,
    #[serde(rename = "linkUrl")]
    pub link_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostInput {
    pub id: String,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    #[serde(rename = "mediaIds")]
    pub media_ids: Vec<String>,
    #[serde(rename = "scheduledFor")]
    pub scheduled_for: Option<i64>,
    #[serde(rename = "linkUrl")]
    pub link_url: Option<String>,
}

pub struct DbState {
    pub conn: Mutex<Connection>,
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("SocialForge");
    fs::create_dir_all(&path).ok();
    path.push("socialforge.db");
    path
}

fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
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

    Ok(conn)
}

#[tauri::command]
fn create_post(state: State<DbState>, input: CreatePostInput) -> Result<Post, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_json = serde_json::to_string(&input.media_ids).unwrap_or_default();
    let status = if input.scheduled_for.is_some() {
        "SCHEDULED"
    } else {
        "DRAFT"
    };

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            input.workspace_id,
            input.text,
            platforms_json,
            media_json,
            input.scheduled_for,
            status,
            None::<String>,
            input.link_url,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Post {
        id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_json,
        scheduled_for: input.scheduled_for,
        status: status.to_string(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
fn list_posts(state: State<DbState>, workspace_id: String) -> Result<Vec<Post>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at
             FROM posts WHERE workspace_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let post_iter = stmt
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
        .map_err(|e| e.to_string())?;

    let mut posts = Vec::new();
    for post in post_iter {
        if let Ok(p) = post {
            posts.push(p);
        }
    }

    Ok(posts)
}

#[tauri::command]
fn update_post(state: State<DbState>, input: UpdatePostInput) -> Result<Post, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_json = serde_json::to_string(&input.media_ids).unwrap_or_default();
    let status = if input.scheduled_for.is_some() {
        "SCHEDULED"
    } else {
        "DRAFT"
    };

    conn.execute(
        "UPDATE posts SET workspace_id = ?1, text = ?2, platforms = ?3, media_ids = ?4, scheduled_for = ?5, status = ?6, link_url = ?7, updated_at = ?8 WHERE id = ?9",
        params![
            input.workspace_id,
            input.text,
            platforms_json,
            media_json,
            input.scheduled_for,
            status,
            input.link_url,
            now,
            input.id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Post {
        id: input.id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_json,
        scheduled_for: input.scheduled_for,
        status: status.to_string(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
fn delete_post(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("Error al inicializar la base de datos SQLite");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState {
            conn: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            create_post,
            list_posts,
            update_post,
            delete_post,
            facebook::get_facebook_auth_url,
            facebook::publish_to_facebook_page
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}