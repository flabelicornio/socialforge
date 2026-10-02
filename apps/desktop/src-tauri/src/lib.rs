mod facebook;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

pub struct DbState {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Deserialize)]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Vec<String>,
    pub scheduled_for: Option<i64>,
    pub link_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostInput {
    pub id: String,
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Vec<String>,
    pub scheduled_for: Option<i64>,
    pub link_url: Option<String>,
}

#[tauri::command]
pub fn create_post(state: State<'_, DbState>, input: CreatePostInput) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_ids_json = serde_json::to_string(&input.media_ids).unwrap_or_default();

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, scheduled_for, status, link_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &id,
            &input.workspace_id,
            &input.text,
            &platforms_json,
            &media_ids_json,
            &input.scheduled_for,
            "DRAFT",
            &input.link_url,
            now,
            now,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(Post {
        id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_ids_json,
        scheduled_for: input.scheduled_for,
        status: "DRAFT".into(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_posts(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Post>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at FROM posts WHERE workspace_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let post_iter = stmt
        .query_map([workspace_id], |row| {
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
        posts.push(post.map_err(|e| e.to_string())?);
    }
    Ok(posts)
}

#[tauri::command]
pub fn update_post(state: State<'_, DbState>, input: UpdatePostInput) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_ids_json = serde_json::to_string(&input.media_ids).unwrap_or_default();

    conn.execute(
        "UPDATE posts SET text = ?1, platforms = ?2, media_ids = ?3, scheduled_for = ?4, link_url = ?5, updated_at = ?6 WHERE id = ?7",
        (
            &input.text,
            &platforms_json,
            &media_ids_json,
            &input.scheduled_for,
            &input.link_url,
            now,
            &input.id,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(Post {
        id: input.id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_ids_json,
        scheduled_for: input.scheduled_for,
        status: "DRAFT".into(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_post(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn init_db() -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open("socialforge.db")?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = init_db().expect("Error al inicializar SQLite");

    tauri::Builder::default()
        .manage(DbState {
            db: Mutex::new(conn),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_post,
            list_posts,
            update_post,
            delete_post,
            facebook::get_facebook_auth_url,
            facebook::publish_to_facebook_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}