// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

struct DbState {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Post {
    id: String,
    workspace_id: String,
    text: String,
    platforms: String,
    media_ids: String,
    scheduled_for: Option<i64>,
    status: String,
    failure_reason: Option<String>,
    link_url: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePostInput {
    workspace_id: String,
    text: String,
    platforms: Vec<String>,
    media_ids: Vec<String>,
    scheduled_for: Option<i64>,
    link_url: Option<String>,
}

fn get_conn<'a>(state: &'a State<DbState>) -> std::sync::MutexGuard<'a, Connection> {
    state.into_inner().conn.lock().expect("failed to lock db")
}

#[tauri::command]
fn list_posts(workspace_id: String, state: State<DbState>) -> Result<Vec<Post>, String> {
    let conn = get_conn(&state);
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at FROM posts WHERE workspace_id = ?1 ORDER BY scheduled_for ASC, created_at DESC",
        )
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
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(posts)
}

#[tauri::command]
fn create_post(input: CreatePostInput, state: State<DbState>) -> Result<Post, String> {
    let conn = get_conn(&state);
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    let platforms_json = serde_json::to_string(&input.platforms).map_err(|e| e.to_string())?;
    let media_ids_json = serde_json::to_string(&input.media_ids).map_err(|e| e.to_string())?;
    let status = if input.scheduled_for.is_some() { "PENDING" } else { "READY_FOR_USER" };

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, scheduled_for, status, link_url, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![id, input.workspace_id, input.text, platforms_json, media_ids_json, input.scheduled_for, status, input.link_url, now, now],
    ).map_err(|e| e.to_string())?;

    if let Some(run_at) = input.scheduled_for {
        for platform in &input.platforms {
            let job_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO jobs (id, post_id, platform, run_at, status, attempts, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'PENDING', 0, ?5, ?6)",
                params![job_id, id, platform, run_at, now, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(Post {
        id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_ids_json,
        scheduled_for: input.scheduled_for,
        status: status.to_string(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
fn update_post(
    id: String,
    patch_text: Option<String>,
    patch_scheduled_for: Option<Option<i64>>,
    patch_link_url: Option<Option<String>>,
    state: State<DbState>,
) -> Result<String, String> {
    let conn = get_conn(&state);
    let now = chrono::Utc::now().timestamp_millis();
    if let Some(text) = patch_text {
        conn.execute("UPDATE posts SET text = ?1, updated_at = ?2 WHERE id = ?3", params![text, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(sched) = patch_scheduled_for {
        conn.execute("UPDATE posts SET scheduled_for = ?1, updated_at = ?2 WHERE id = ?3", params![sched, now, id]).map_err(|e| e.to_string())?;
        if let Some(run_at) = sched {
            conn.execute("UPDATE jobs SET run_at = ?1, status='PENDING', updated_at = ?2 WHERE post_id = ?3", params![run_at, now, id]).map_err(|e| e.to_string())?;
        }
    }
    if let Some(link) = patch_link_url {
        conn.execute("UPDATE posts SET link_url = ?1, updated_at = ?2 WHERE id = ?3", params![link, now, id]).map_err(|e| e.to_string())?;
    }
    Ok(id)
}

#[tauri::command]
fn delete_post(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = get_conn(&state);
    conn.execute("DELETE FROM jobs WHERE post_id = ?1", params![id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_due_jobs(state: State<DbState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = get_conn(&state);
    let now = chrono::Utc::now().timestamp_millis();
    let mut stmt = conn.prepare("SELECT j.id, j.platform, j.run_at, p.id, p.text, p.platforms, p.media_ids, p.link_url FROM jobs j JOIN posts p ON j.post_id = p.id WHERE j.run_at <= ?1 AND j.status IN ('PENDING','RETRY') ORDER BY j.run_at ASC LIMIT 10").map_err(|e| e.to_string())?;
    let jobs = stmt.query_map(params![now], |row| {
        Ok(serde_json::json!({
            "jobId": row.get::<_, String>(0)?,
            "platform": row.get::<_, String>(1)?,
            "runAt": row.get::<_, i64>(2)?,
            "postId": row.get::<_, String>(3)?,
            "text": row.get::<_, String>(4)?,
            "platforms": row.get::<_, String>(5)?,
            "mediaIds": row.get::<_, String>(6)?,
            "linkUrl": row.get::<_, Option<String>>(7)?,
        }))
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(jobs)
}

#[tauri::command]
fn mark_job_status(job_id: String, status: String, error: Option<String>, state: State<DbState>) -> Result<(), String> {
    let conn = get_conn(&state);
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute("UPDATE jobs SET status = ?1, last_error = ?2, attempts = attempts + 1, updated_at = ?3 WHERE id = ?4", params![status, error, now, job_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// Corre las migraciones a mano, llevando la cuenta con PRAGMA user_version.
// Reemplaza al plugin tauri_plugin_sql, que ya no está en Cargo.toml.
fn run_migrations(conn: &Connection) {
    let migrations: Vec<(i32, &str)> = vec![
        (1, include_str!("../migrations/001_init.sql")),
        (2, include_str!("../migrations/002_ads_addon.sql")),
        (3, include_str!("../migrations/003_language.sql")),
        (4, include_str!("../migrations/004_link_url.sql")),
    ];

    let current_version: i32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap_or(0);

    for (version, sql) in migrations {
        if version > current_version {
            conn.execute_batch(sql).expect("migración falló");
            conn.execute_batch(&format!("PRAGMA user_version = {}", version)).ok();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("no app_data_dir");
            std::fs::create_dir_all(&app_dir).expect("create app_data_dir");
            let db_path = app_dir.join("socialforge.db");
            let conn = Connection::open(&db_path).expect("open db failed");
            conn.execute_batch("PRAGMA journal_mode=WAL;").ok();
            run_migrations(&conn);
            app.manage(DbState { conn: Mutex::new(conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_posts,
            create_post,
            update_post,
            delete_post,
            get_due_jobs,
            mark_job_status
        ])
        .run(tauri::generate_context!())
        .expect("error corriendo SocialForge");
}
