pub mod facebook;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

pub struct DbState {
    pub db: Mutex<Connection>,
}

// ---------- POSTS ----------

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

pub fn create_post_internal(state: State<'_, DbState>, input: CreatePostInput) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_ids_json = serde_json::to_string(&input.media_ids).unwrap_or_default();

    // DRAFT si no tiene fecha programada, PENDING si sí la tiene
    // (PENDING es el estado de cola, coherente con el diseño original).
    let status = if input.scheduled_for.is_some() { "PENDING" } else { "DRAFT" };

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
            status,
            &input.link_url,
            now,
            now,
        ),
    ).map_err(|e| e.to_string())?;

    if let Some(run_at) = input.scheduled_for {
        create_jobs_for_post(&conn, &id, &input.platforms, run_at, now)?;
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

pub fn list_posts_internal(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Post>, String> {
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

pub fn update_post_internal(state: State<'_, DbState>, input: UpdatePostInput) -> Result<Post, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    let platforms_json = serde_json::to_string(&input.platforms).unwrap_or_default();
    let media_ids_json = serde_json::to_string(&input.media_ids).unwrap_or_default();
    let status = if input.scheduled_for.is_some() { "PENDING" } else { "DRAFT" };

    conn.execute(
        "UPDATE posts SET text = ?1, platforms = ?2, media_ids = ?3, scheduled_for = ?4, link_url = ?5, status = ?6, updated_at = ?7 WHERE id = ?8",
        (
            &input.text,
            &platforms_json,
            &media_ids_json,
            &input.scheduled_for,
            &input.link_url,
            status,
            now,
            &input.id,
        ),
    ).map_err(|e| e.to_string())?;

    // Si se reprograma, borra jobs viejos pendientes y crea los nuevos.
    conn.execute(
        "DELETE FROM jobs WHERE post_id = ?1 AND status IN ('PENDING','RETRY')",
        [&input.id],
    ).map_err(|e| e.to_string())?;

    if let Some(run_at) = input.scheduled_for {
        create_jobs_for_post(&conn, &input.id, &input.platforms, run_at, now)?;
    }

    Ok(Post {
        id: input.id,
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

pub fn delete_post_internal(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM jobs WHERE post_id = ?1", [&id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM posts WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- ACCOUNTS ----------

#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub workspace_id: String,
    pub platform: String,
    pub external_account_id: String,
    pub display_name: String,
    pub connected_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct SaveAccountInput {
    pub workspace_id: String,
    pub platform: String,
    pub external_account_id: String,
    pub display_name: String,
    pub access_token: String,
}

#[tauri::command]
pub fn save_facebook_account(
    state: State<'_, DbState>,
    input: SaveAccountInput,
) -> Result<Account, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    // Reemplaza si ya existía esa misma página conectada (evita duplicados).
    conn.execute(
        "DELETE FROM accounts WHERE platform = ?1 AND external_account_id = ?2",
        (&input.platform, &input.external_account_id),
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO accounts (id, workspace_id, platform, external_account_id, display_name, access_token, connected_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (
            &id,
            &input.workspace_id,
            &input.platform,
            &input.external_account_id,
            &input.display_name,
            &input.access_token,
            now,
        ),
    ).map_err(|e| e.to_string())?;

    // NOTA: por ahora el access_token vive en esta misma tabla SQLite local
    // (no en texto plano en logs, no sale de la máquina). Migrar a
    // Keychain/Credential Manager queda como mejora de seguridad posterior,
    // no bloquea que el flujo funcione hoy.

    Ok(Account {
        id,
        workspace_id: input.workspace_id,
        platform: input.platform,
        external_account_id: input.external_account_id,
        display_name: input.display_name,
        connected_at: now,
    })
}

#[tauri::command]
pub fn list_accounts(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, platform, external_account_id, display_name, connected_at FROM accounts WHERE workspace_id = ?1")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([workspace_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                platform: row.get(2)?,
                external_account_id: row.get(3)?,
                display_name: row.get(4)?,
                connected_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut accounts = Vec::new();
    for a in rows {
        accounts.push(a.map_err(|e| e.to_string())?);
    }
    Ok(accounts)
}

fn get_access_token(conn: &Connection, platform: &str) -> Result<Option<(String, String)>, String> {
    // Devuelve (external_account_id, access_token) de la primera cuenta
    // conectada para esa plataforma. MVP: una cuenta por plataforma.
    conn.query_row(
        "SELECT external_account_id, access_token FROM accounts WHERE platform = ?1 LIMIT 1",
        [platform],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map(Some)
    .or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        other => Err(other.to_string()),
    })
}

// ---------- JOBS / SCHEDULER ----------

fn create_jobs_for_post(
    conn: &Connection,
    post_id: &str,
    platforms: &[String],
    run_at: i64,
    now: i64,
) -> Result<(), String> {
    for platform in platforms {
        let job_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO jobs (id, post_id, platform, run_at, status, attempts, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'PENDING', 0, ?5, ?5)",
            (&job_id, post_id, platform, run_at, now),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Revisa jobs vencidos y los procesa. Se llama al abrir la app (catch-up)
/// y cada 60s mientras sigue abierta.
pub async fn process_due_jobs(app_handle: &AppHandle) {
    let state = app_handle.state::<DbState>();
    let now = chrono::Utc::now().timestamp_millis();

    // 1. Recolecta jobs vencidos (bloqueo corto, se libera antes de llamar a Meta)
    struct DueJob {
        id: String,
        post_id: String,
        platform: String,
        attempts: i32,
    }

    let due: Vec<DueJob> = {
        let conn = match state.db.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        let mut stmt = match conn.prepare(
            "SELECT id, post_id, platform, attempts FROM jobs
             WHERE run_at <= ?1 AND status IN ('PENDING','RETRY')",
        ) {
            Ok(s) => s,
            Err(_) => return,
        };
        let rows = stmt.query_map([now], |row| {
            Ok(DueJob {
                id: row.get(0)?,
                post_id: row.get(1)?,
                platform: row.get(2)?,
                attempts: row.get(3)?,
            })
        });
        match rows {
            Ok(r) => r.filter_map(|x| x.ok()).collect(),
            Err(_) => return,
        }
    };

    for job in due {
        // Marca PROCESSING antes de intentar, para no reintentar en paralelo
        // si el timer dispara de nuevo mientras una publicación tarda.
        {
            if let Ok(conn) = state.db.lock() {
                let _ = conn.execute(
                    "UPDATE jobs SET status = 'PROCESSING', updated_at = ?1 WHERE id = ?2",
                    (chrono::Utc::now().timestamp_millis(), &job.id),
                );
            }
        }

        let result: Result<String, String> = if job.platform == "facebook" {
            let token_data = {
                let conn = state.db.lock().map_err(|e| e.to_string());
                match conn {
                    Ok(c) => get_access_token(&c, "facebook"),
                    Err(e) => Err(e),
                }
            };

            match token_data {
                Ok(Some((page_id, access_token))) => {
                    let text = {
                        let conn = state.db.lock().map_err(|e| e.to_string());
                        conn.and_then(|c| {
                            c.query_row(
                                "SELECT text, link_url FROM posts WHERE id = ?1",
                                [&job.post_id],
                                |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
                            )
                            .map_err(|e| e.to_string())
                        })
                    };
                    match text {
                        Ok((message, link_url)) => {
                            facebook::publish_to_facebook_page(page_id, access_token, message, link_url).await
                        }
                        Err(e) => Err(e),
                    }
                }
                Ok(None) => Err("No hay cuenta de Facebook conectada".to_string()),
                Err(e) => Err(e),
            }
        } else {
            // Plataforma sin conector real todavía: se deja lista para el
            // usuario en vez de inventar que se publicó.
            Err("READY_FOR_USER".to_string())
        };

        if let Ok(conn) = state.db.lock() {
            let now2 = chrono::Utc::now().timestamp_millis();
            match result {
                Ok(_remote_id) => {
                    let _ = conn.execute(
                        "UPDATE jobs SET status = 'PUBLISHED', updated_at = ?1 WHERE id = ?2",
                        (now2, &job.id),
                    );
                    let _ = conn.execute(
                        "UPDATE posts SET status = 'PUBLISHED', updated_at = ?1 WHERE id = ?2",
                        (now2, &job.post_id),
                    );
                }
                Err(msg) if msg == "READY_FOR_USER" => {
                    let _ = conn.execute(
                        "UPDATE jobs SET status = 'READY_FOR_USER', updated_at = ?1 WHERE id = ?2",
                        (now2, &job.id),
                    );
                    let _ = conn.execute(
                        "UPDATE posts SET status = 'READY_FOR_USER', updated_at = ?1 WHERE id = ?2",
                        (now2, &job.post_id),
                    );
                }
                Err(msg) => {
                    let attempts = job.attempts + 1;
                    let next_status = if attempts >= 3 { "FAILED" } else { "RETRY" };
                    let _ = conn.execute(
                        "UPDATE jobs SET status = ?1, attempts = ?2, last_error = ?3, updated_at = ?4 WHERE id = ?5",
                        (next_status, attempts, &msg, now2, &job.id),
                    );
                    let _ = conn.execute(
                        "UPDATE posts SET status = ?1, failure_reason = ?2, updated_at = ?3 WHERE id = ?4",
                        (next_status, &msg, now2, &job.post_id),
                    );
                }
            }
        }
    }
}

/// Arranca el scheduler: corre process_due_jobs una vez de inmediato
/// (catch-up de jobs atrasados) y luego cada 60 segundos mientras la
/// app siga abierta. No hace nada si la app está cerrada — eso es
/// esperado en una arquitectura local-first.
pub fn start_scheduler(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        process_due_jobs(&app_handle).await; // catch-up al abrir
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            process_due_jobs(&app_handle).await;
        }
    });
}

// ---------- DB INIT ----------

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let mut db_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./"));
    fs::create_dir_all(&db_dir)?;
    db_dir.push("socialforge.db");

    let conn = Connection::open(db_dir)?;

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

    conn.execute(
        "CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            external_account_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            access_token TEXT NOT NULL,
            connected_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            run_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_run_at ON jobs(run_at)", [])?;

    Ok(conn)
}
