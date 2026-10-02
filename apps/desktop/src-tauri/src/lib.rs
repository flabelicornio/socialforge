use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub mod facebook;

pub struct DbState {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub workspace_id: String,
    pub platform: String,
    pub display_name: String,
    pub connected_at: i64,
    pub external_account_id: Option<String>,
    pub extra_json: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Deserialize)]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Option<Vec<String>>,
    pub link_url: Option<String>,
    pub scheduled_for: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostInput {
    pub id: String,
    pub text: Option<String>,
    pub platforms: Option<Vec<String>>,
    pub media_ids: Option<Vec<String>>,
    pub link_url: Option<String>,
    pub scheduled_for: Option<i64>,
    pub status: Option<String>,
}

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al obtener app_data_dir: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Error al crear el directorio de la aplicacion: {}", e))?;
    }

    let db_path = app_dir.join("socialforge.db");
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Error al abrir/crear SQLite en {:?}: {}", db_path, e))?;

    // Tablas base
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
            connected_at INTEGER NOT NULL,
            external_account_id TEXT,
            extra_json TEXT
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
    )
    .map_err(|e| format!("Error en las migraciones de SQLite: {}", e))?;

    // Workspace por defecto si no existe
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM workspaces WHERE id = 'default'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if count == 0 {
        let now = Utc::now().timestamp_millis();
        let _ = conn.execute(
            "INSERT INTO workspaces (id, name, created_at) VALUES ('default', 'Mi Espacio', ?1)",
            params![now],
        );
    }

    Ok(conn)
}

pub fn create_post_internal(
    state: State<'_, DbState>,
    input: CreatePostInput,
) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();

    let platforms_json =
        serde_json::to_string(&input.platforms).map_err(|e| format!("JSON error: {}", e))?;
    let media_json = serde_json::to_string(&input.media_ids.unwrap_or_default())
        .map_err(|e| format!("JSON error: {}", e))?;

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
            media_json,
            input.link_url,
            input.scheduled_for,
            status,
            now,
            now
        ],
    ).map_err(|e| format!("Error insertando post: {}", e))?;

    Ok(Post {
        id,
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: platforms_json,
        media_ids: media_json,
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

    let rows = stmt
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

    let mut result = Vec::new();
    for post in rows {
        if let Ok(p) = post {
            result.push(p);
        }
    }
    Ok(result)
}

pub fn update_post_internal(
    state: State<'_, DbState>,
    input: UpdatePostInput,
) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().timestamp_millis();

    if let Some(text) = &input.text {
        let _ = conn.execute(
            "UPDATE posts SET text = ?1, updated_at = ?2 WHERE id = ?3",
            params![text, now, input.id],
        );
    }
    if let Some(platforms) = &input.platforms {
        let json = serde_json::to_string(platforms).unwrap_or_default();
        let _ = conn.execute(
            "UPDATE posts SET platforms = ?1, updated_at = ?2 WHERE id = ?3",
            params![json, now, input.id],
        );
    }
    if let Some(media) = &input.media_ids {
        let json = serde_json::to_string(media).unwrap_or_default();
        let _ = conn.execute(
            "UPDATE posts SET media_ids = ?1, updated_at = ?2 WHERE id = ?3",
            params![json, now, input.id],
        );
    }
    if let Some(link) = &input.link_url {
        let _ = conn.execute(
            "UPDATE posts SET link_url = ?1, updated_at = ?2 WHERE id = ?3",
            params![link, now, input.id],
        );
    }
    if let Some(sched) = input.scheduled_for {
        let _ = conn.execute(
            "UPDATE posts SET scheduled_for = ?1, updated_at = ?2 WHERE id = ?3",
            params![sched, now, input.id],
        );
    }
    if let Some(status) = &input.status {
        let _ = conn.execute(
            "UPDATE posts SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, input.id],
        );
    }

    conn.query_row(
        "SELECT id, workspace_id, text, platforms, media_ids, link_url, scheduled_for, status, failure_reason, created_at, updated_at FROM posts WHERE id = ?1",
        params![input.id],
        |row| {
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
        },
    )
    .map_err(|e| format!("Error al obtener post actualizado: {}", e))
}

pub fn delete_post_internal(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", params![id])
        .map_err(|e| format!("Error borrando post: {}", e))?;
    Ok(())
}

pub fn save_facebook_account_internal(
    state: State<'_, DbState>,
    workspace_id: String,
    user_access_token: String,
) -> Result<Account, String> {
    // Obtiene las páginas asociadas desde Meta API
    let pages = facebook::get_user_pages(&user_access_token)?;
    let first_page = pages
        .first()
        .ok_or_else(|| "No se encontraron páginas de Facebook asociadas a este usuario".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().timestamp_millis();
    let account_id = uuid::Uuid::new_v4().to_string();

    let extra = serde_json::json!({
        "page_access_token": first_page.access_token
    })
    .to_string();

    conn.execute(
        "INSERT INTO accounts (id, workspace_id, platform, display_name, connected_at, external_account_id, extra_json)
         VALUES (?1, ?2, 'facebook', ?3, ?4, ?5, ?6)",
        params![
            account_id,
            workspace_id,
            first_page.name,
            now,
            first_page.id,
            extra
        ],
    )
    .map_err(|e| format!("Error al guardar la cuenta en SQLite: {}", e))?;

    Ok(Account {
        id: account_id,
        workspace_id,
        platform: "facebook".to_string(),
        display_name: first_page.name.clone(),
        connected_at: now,
        external_account_id: Some(first_page.id.clone()),
        extra_json: Some(extra),
    })
}

pub fn list_accounts_internal(
    state: State<'_, DbState>,
    workspace_id: String,
) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, platform, display_name, connected_at, external_account_id, extra_json 
             FROM accounts WHERE workspace_id = ?1 ORDER BY connected_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![workspace_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                platform: row.get(2)?,
                display_name: row.get(3)?,
                connected_at: row.get(4)?,
                external_account_id: row.get(5)?,
                extra_json: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for acc in rows {
        if let Ok(a) = acc {
            result.push(a);
        }
    }
    Ok(result)
}

pub fn start_scheduler(app_handle: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;

            if let Some(state) = app_handle.try_state::<DbState>() {
                if let Ok(conn) = state.db.lock() {
                    let now = Utc::now().timestamp_millis();
                    let mut stmt = match conn.prepare(
                        "SELECT id, text, link_url, extra_json FROM posts 
                         JOIN accounts ON accounts.workspace_id = posts.workspace_id
                         WHERE posts.status = 'PENDING' AND posts.scheduled_for <= ?1",
                    ) {
                        Ok(s) => s,
                        Err(_) => continue,
                    };

                    let pending_posts = stmt.query_map(params![now], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, Option<String>>(2)?,
                            row.get::<_, Option<String>>(3)?,
                        ))
                    });

                    if let Ok(posts) = pending_posts {
                        for p in posts.flatten() {
                            let (post_id, text, _link, extra_json) = p;
                            if let Some(extra_str) = extra_json {
                                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&extra_str) {
                                    if let Some(page_token) = v.get("page_access_token").and_then(|t| t.as_str()) {
                                        // Marca como procesando para evitar duplicados
                                        let _ = conn.execute(
                                            "UPDATE posts SET status = 'PROCESSING' WHERE id = ?1",
                                            params![post_id],
                                        );

                                        // Publica a Facebook via graph api
                                        match facebook::publish_to_facebook_page("me", page_token, &text) {
                                            Ok(_) => {
                                                let _ = conn.execute(
                                                    "UPDATE posts SET status = 'PUBLISHED', updated_at = ?1 WHERE id = ?2",
                                                    params![Utc::now().timestamp_millis(), post_id],
                                                );
                                            }
                                            Err(err) => {
                                                let _ = conn.execute(
                                                    "UPDATE posts SET status = 'FAILED', failure_reason = ?1, updated_at = ?2 WHERE id = ?3",
                                                    params![err, Utc::now().timestamp_millis(), post_id],
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}