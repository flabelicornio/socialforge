// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

const KEYRING_SERVICE: &str = "socialforge";
const WORKER_BASE_URL: &str = "https://socialforge.wolves-and-crows.workers.dev";

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountSummary {
    id: String,
    platform: String,
    display_name: String,
    external_account_id: Option<String>,
    connected_at: i64,
}

fn get_conn<'a>(state: &'a State<'_, DbState>) -> std::sync::MutexGuard<'a, Connection> {
    state.inner().conn.lock().expect("db lock failed")
}

#[tauri::command]
fn list_posts(workspace_id: String, state: State<DbState>) -> Result<Vec<Post>, String> {
    let target_workspace = if workspace_id.trim().is_empty() { "default".to_string() } else { workspace_id };
    let conn = get_conn(&state);
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, text, platforms, media_ids, scheduled_for, status, failure_reason, link_url, created_at, updated_at FROM posts WHERE workspace_id = ?1 ORDER BY scheduled_for ASC, created_at DESC",
    ).map_err(|e| e.to_string())?;
    let posts = stmt.query_map(params![target_workspace], |row| {
        Ok(Post {
            id: row.get(0)?, workspace_id: row.get(1)?, text: row.get(2)?, platforms: row.get(3)?,
            media_ids: row.get(4)?, scheduled_for: row.get(5)?, status: row.get(6)?,
            failure_reason: row.get(7)?, link_url: row.get(8)?, created_at: row.get(9)?, updated_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(posts)
}

#[tauri::command]
fn create_post(input: CreatePostInput, state: State<DbState>) -> Result<Post, String> {
    let conn = get_conn(&state);
    let workspace_id = if input.workspace_id.trim().is_empty() { "default".to_string() } else { input.workspace_id.clone() };
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    // Garantizar que el workspace exista antes de relacionar el post
    conn.execute(
        "INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?1, 'Mi Espacio', ?2)",
        params![workspace_id, now],
    ).map_err(|e| e.to_string())?;

    let platforms_json = serde_json::to_string(&input.platforms).map_err(|e| e.to_string())?;
    let media_ids_json = serde_json::to_string(&input.media_ids).map_err(|e| e.to_string())?;
    let status = if input.scheduled_for.is_some() { "PENDING" } else { "READY_FOR_USER" };

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, scheduled_for, status, link_url, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![id, workspace_id, input.text, platforms_json, media_ids_json, input.scheduled_for, status, input.link_url, now, now],
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

    Ok(Post { id, workspace_id, text: input.text, platforms: platforms_json, media_ids: media_ids_json, scheduled_for: input.scheduled_for, status: status.to_string(), failure_reason: None, link_url: input.link_url, created_at: now, updated_at: now })
}

#[tauri::command]
fn update_post(id: String, patch_text: Option<String>, patch_scheduled_for: Option<Option<i64>>, patch_link_url: Option<Option<String>>, state: State<DbState>) -> Result<String, String> {
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
            "jobId": row.get::<_, String>(0)?, "platform": row.get::<_, String>(1)?, "runAt": row.get::<_, i64>(2)?,
            "postId": row.get::<_, String>(3)?, "text": row.get::<_, String>(4)?, "platforms": row.get::<_, String>(5)?,
            "mediaIds": row.get::<_, String>(6)?, "linkUrl": row.get::<_, Option<String>>(7)?,
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

#[tauri::command]
fn complete_facebook_connection(state_param: String, workspace_id: String, db_state: State<DbState>) -> Result<serde_json::Value, String> {
    let url = format!("{}/oauth/facebook/result?state={}", WORKER_BASE_URL, state_param);
    let resp: serde_json::Value = reqwest::blocking::get(&url)
        .map_err(|e| format!("no se pudo contactar al Worker: {e}"))?
        .json().map_err(|e| format!("respuesta inválida del Worker: {e}"))?;

    if resp.get("pending").and_then(|v| v.as_bool()).unwrap_or(true) {
        return Ok(serde_json::json!({ "pending": true, "accounts": [] }));
    }

    let pages = resp.get("pages").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let conn = get_conn(&db_state);
    let now = chrono::Utc::now().timestamp_millis();
    let mut saved: Vec<AccountSummary> = Vec::new();
    let target_workspace = if workspace_id.trim().is_empty() { "default".to_string() } else { workspace_id };

    for page in pages {
        let page_id = page.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let page_name = page.get("name").and_then(|v| v.as_str()).unwrap_or("Página sin nombre").to_string();
        let page_token = page.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let ig_account = page.get("instagram_business_account").cloned();

        if page_id.is_empty() || page_token.is_empty() { continue; }

        let account_id = uuid::Uuid::new_v4().to_string();
        let extra_json = serde_json::json!({ "instagramBusinessAccount": ig_account }).to_string();

        conn.execute(
            "INSERT INTO accounts (id, workspace_id, platform, display_name, connected_at, external_account_id, extra_json) VALUES (?1, ?2, 'facebook', ?3, ?4, ?5, ?6)",
            params![account_id, target_workspace, page_name, now, page_id, extra_json],
        ).map_err(|e| e.to_string())?;

        let entry = keyring::Entry::new(KEYRING_SERVICE, &account_id)
            .map_err(|e| format!("no se pudo abrir el keychain: {e}"))?;
        entry.set_password(&page_token).map_err(|e| format!("no se pudo guardar el token: {e}"))?;

        saved.push(AccountSummary { id: account_id, platform: "facebook".to_string(), display_name: page_name, external_account_id: Some(page_id), connected_at: now });
    }

    Ok(serde_json::json!({ "pending": false, "accounts": saved }))
}

#[tauri::command]
fn list_connected_accounts(workspace_id: String, state: State<DbState>) -> Result<Vec<AccountSummary>, String> {
    let target_workspace = if workspace_id.trim().is_empty() { "default".to_string() } else { workspace_id };
    let conn = get_conn(&state);
    let mut stmt = conn.prepare("SELECT id, platform, display_name, external_account_id, connected_at FROM accounts WHERE workspace_id = ?1 ORDER BY connected_at DESC").map_err(|e| e.to_string())?;
    let accounts = stmt.query_map(params![target_workspace], |row| {
        Ok(AccountSummary { id: row.get(0)?, platform: row.get(1)?, display_name: row.get(2)?, external_account_id: row.get(3)?, connected_at: row.get(4)? })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(accounts)
}

#[tauri::command]
fn disconnect_account(account_id: String, state: State<DbState>) -> Result<(), String> {
    let conn = get_conn(&state);
    conn.execute("DELETE FROM accounts WHERE id = ?1", params![account_id]).map_err(|e| e.to_string())?;
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, &account_id) {
        let _ = entry.delete_credential();
    }
    Ok(())
}

fn run_migrations(conn: &Connection) {
    let migrations: Vec<(i32, &str)> = vec![
        (1, include_str!("../migrations/001_init.sql")),
        (2, include_str!("../migrations/002_ads_addon.sql")),
        (3, include_str!("../migrations/003_language.sql")),
        (4, include_str!("../migrations/004_link_url.sql")),
        (5, include_str!("../migrations/005_account_external_id.sql")),
    ];
    let current_version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0)).unwrap_or(0);
    for (version, sql) in migrations {
        if version > current_version {
            conn.execute_batch(sql).expect("migración falló");
            conn.execute_batch(&format!("PRAGMA user_version = {}", version)).ok();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("no app_data_dir");
            std::fs::create_dir_all(&app_dir).expect("create app_data_dir");
            let db_path = app_dir.join("socialforge.db");
            let conn = Connection::open(&db_path).expect("open db failed");
            conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys = ON;").ok();
            run_migrations(&conn);

            // Semilla obligatoria: Asegurar que el workspace 'default' exista siempre
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            
            conn.execute(
                "INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES ('default', 'Mi Espacio', ?1)",
                params![now],
            ).ok();

            app.manage(DbState { conn: Mutex::new(conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_posts, create_post, update_post, delete_post, get_due_jobs, mark_job_status,
            complete_facebook_connection, list_connected_accounts, disconnect_account
        ])
        .run(tauri::generate_context!())
        .expect("error corriendo SocialForge");
}