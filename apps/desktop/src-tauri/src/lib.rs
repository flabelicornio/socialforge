use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub mod facebook;

pub struct DbState {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    pub id: String,
    pub workspace_id: String,
    pub text: String,
    pub platforms: String,
    pub media_ids: String,
    pub link_url: Option<String>,
    pub scheduled_for: Option<i64>,
    pub status: String,
    pub failure_reason: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Option<Vec<String>>,
    pub link_url: Option<String>,
    pub scheduled_for: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePostInput {
    pub id: String,
    pub text: Option<String>,
    pub platforms: Option<Vec<String>>,
    pub media_ids: Option<Vec<String>>,
    pub link_url: Option<String>,
    pub scheduled_for: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub workspace_id: String,
    pub platform: String,
    pub display_name: String,
    pub external_account_id: Option<String>,
    pub extra_json: Option<String>,
    pub connected_at: i64,
}

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let mut db_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./"));
    fs::create_dir_all(&db_dir)?;
    db_dir.push("socialforge.db");

    let conn = Connection::open(db_dir)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            display_name TEXT NOT NULL,
            external_account_id TEXT,
            extra_json TEXT,
            connected_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            text TEXT NOT NULL DEFAULT '',
            platforms TEXT NOT NULL,
            media_ids TEXT NOT NULL DEFAULT '[]',
            link_url TEXT,
            scheduled_for INTEGER,
            status TEXT NOT NULL DEFAULT 'PENDING',
            failure_reason TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
    )?;

    Ok(conn)
}

pub fn create_post_internal(
    state: State<'_, DbState>,
    input: CreatePostInput,
) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let platforms_json =
        serde_json::to_string(&input.platforms).map_err(|e| e.to_string())?;
    let media_ids_json = serde_json::to_string(&input.media_ids.unwrap_or_default())
        .map_err(|e| e.to_string())?;

    let status = if input.scheduled_for.is_some() {
        "PENDING".to_string()
    } else {
        "DRAFT".to_string()
    };

    conn.execute(
        "INSERT INTO posts (id, workspace_id, text, platforms, media_ids, link_url, scheduled_for, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            input.workspace_id,
            input.text,
            platforms_json,
            media_ids_json,
            input.link_url,
            input.scheduled_for,
            status,
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
        media_ids: media_ids_json,
        link_url: input.link_url,
        scheduled_for: input.scheduled_for,
        status,
        failure_reason: None,
        created_at: now,
        updated_at: now,
    })
}

pub fn list_posts_internal(
    state: State<'_, DbState>,
    workspace_id: String,
) -> Result<Vec<Post>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, text, platforms, media_ids, link_url, scheduled_for, status, failure_reason, created_at, updated_at
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
                link_url: row.get(5)?,
                scheduled_for: row.get(6)?,
                status: row.get(7)?,
                failure_reason: row.get(8)?,
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

pub fn update_post_internal(
    state: State<'_, DbState>,
    input: UpdatePostInput,
) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    if let Some(ref text) = input.text {
        conn.execute(
            "UPDATE posts SET text = ?1, updated_at = ?2 WHERE id = ?3",
            params![text, now, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(ref platforms) = input.platforms {
        let json = serde_json::to_string(platforms).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE posts SET platforms = ?1, updated_at = ?2 WHERE id = ?3",
            params![json, now, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(ref link_url) = input.link_url {
        conn.execute(
            "UPDATE posts SET link_url = ?1, updated_at = ?2 WHERE id = ?3",
            params![link_url, now, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(scheduled_for) = input.scheduled_for {
        conn.execute(
            "UPDATE posts SET scheduled_for = ?1, updated_at = ?2 WHERE id = ?3",
            params![scheduled_for, now, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(ref status) = input.status {
        conn.execute(
            "UPDATE posts SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare("SELECT id, workspace_id, text, platforms, media_ids, link_url, scheduled_for, status, failure_reason, created_at, updated_at FROM posts WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let post = stmt
        .query_row(params![input.id], |row| {
            Ok(Post {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                text: row.get(2)?,
                platforms: row.get(3)?,
                media_ids: row.get(4)?,
                link_url: row.get(5)?,
                scheduled_for: row.get(6)?,
                status: row.get(7)?,
                failure_reason: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(post)
}

pub fn delete_post_internal(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn save_facebook_account_internal(
    state: State<'_, DbState>,
    workspace_id: String,
    user_access_token: String,
) -> Result<Account, String> {
    let pages = facebook::get_user_pages(&user_access_token).await?;

    if pages.is_empty() {
        return Err("No se encontraron Páginas de Facebook administradas por esta cuenta.".to_string());
    }

    let page = &pages[0];
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();
    let account_id = format!("fb_{}", page.id);

    let extra_json = serde_json::to_string(&serde_json::json!({
        "page_access_token": page.access_token,
        "user_access_token": user_access_token,
    }))
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO accounts (id, workspace_id, platform, display_name, external_account_id, extra_json, connected_at)
         VALUES (?1, ?2, 'facebook', ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            display_name = excluded.display_name,
            extra_json = excluded.extra_json,
            connected_at = excluded.connected_at",
        params![
            account_id,
            workspace_id,
            page.name,
            page.id,
            extra_json,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Account {
        id: account_id,
        workspace_id,
        platform: "facebook".to_string(),
        display_name: page.name.clone(),
        external_account_id: Some(page.id.clone()),
        extra_json: Some(extra_json),
        connected_at: now,
    })
}

pub fn list_accounts_internal(
    state: State<'_, DbState>,
    workspace_id: String,
) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, platform, display_name, external_account_id, extra_json, connected_at
             FROM accounts WHERE workspace_id = ?1 ORDER BY connected_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map(params![workspace_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                platform: row.get(2)?,
                display_name: row.get(3)?,
                external_account_id: row.get(4)?,
                extra_json: row.get(5)?,
                connected_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut accounts = Vec::new();
    for acc in iter {
        accounts.push(acc.map_err(|e| e.to_string())?);
    }

    Ok(accounts)
}

pub fn start_scheduler(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;

            // 1. Leemos los posts pendientes y las credenciales liberando la DB de inmediato
            let pending_tasks = if let Some(state) = app_handle.try_state::<DbState>() {
                if let Ok(conn) = state.db.lock() {
                    let now = chrono::Utc::now().timestamp_millis();
                    let mut stmt = match conn.prepare(
                        "SELECT id, text, link_url FROM posts WHERE status = 'PENDING' AND scheduled_for <= ?1",
                    ) {
                        Ok(s) => s,
                        Err(_) => continue,
                    };

                    let due_posts: Vec<(String, String, Option<String>)> = stmt
                        .query_map(params![now], |row| {
                            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                        })
                        .ok()
                        .map(|iter| iter.filter_map(|r| r.ok()).collect())
                        .unwrap_or_default();

                    let mut tasks = Vec::new();

                    for (id, text, link_url) in due_posts {
                        let mut acc_stmt = match conn.prepare(
                            "SELECT extra_json, external_account_id FROM accounts WHERE platform = 'facebook' LIMIT 1",
                        ) {
                            Ok(s) => s,
                            Err(_) => continue,
                        };

                        let account_data: Option<(Option<String>, Option<String>)> = acc_stmt
                            .query_row([], |row| Ok((row.get(0)?, row.get(1)?)))
                            .ok();

                        if let Some((Some(extra_json), Some(page_id))) = account_data {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&extra_json) {
                                if let Some(page_token) = val.get("page_access_token").and_then(|v| v.as_str()) {
                                    tasks.push((id, page_id, page_token.to_string(), text, link_url));
                                }
                            }
                        }
                    }
                    tasks
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            };

            // 2. Realizamos la llamada a la API fuera del candado de SQLite
            for (id, page_id, page_token, text, link_url) in pending_tasks {
                let res = facebook::publish_to_facebook_page(
                    page_id,
                    page_token,
                    text,
                    link_url,
                )
                .await;

                // 3. Volvemos a solicitar acceso a la DB solo para actualizar el estado del post
                if let Some(state) = app_handle.try_state::<DbState>() {
                    if let Ok(conn) = state.db.lock() {
                        let now = chrono::Utc::now().timestamp_millis();
                        match res {
                            Ok(_) => {
                                let _ = conn.execute(
                                    "UPDATE posts SET status = 'PUBLISHED', updated_at = ?1 WHERE id = ?2",
                                    params![now, id],
                                );
                            }
                            Err(err) => {
                                let _ = conn.execute(
                                    "UPDATE posts SET status = 'FAILED', failure_reason = ?1, updated_at = ?2 WHERE id = ?3",
                                    params![err, now, id],
                                );
                            }
                        }
                    }
                }
            }
        }
    });
}