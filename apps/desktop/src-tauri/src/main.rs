use tauri::{Manager, State};
use rusqlite::{Connection, params};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: String,
    pub workspace_id: String,
    pub content: String,
    pub scheduled_for: String,
    pub link_url: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub content: String,
    pub scheduled_for: String,
    pub link_url: Option<String>,
}

pub struct DbState(pub Arc<Mutex<Connection>>);

#[tauri::command]
fn list_posts(state: State<DbState>) -> Result<Vec<Post>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    //... tu lógica real aquí
    Ok(vec![])
}

#[tauri::command]
fn create_post(state: State<DbState>, input: CreatePostInput) -> Result<Post, String> {
    //... tu lógica real aquí
    Err("implement me".into())
}

fn main() {
    tauri::Builder::default()
       .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&app_dir).unwrap();
            let db_path = app_dir.join("socialforge.db");
            let conn = Connection::open(&db_path).expect("failed to open db");

            // CORRE LAS 4 MIGRACIONES A MANO CON RUSQLITE - una sola vía
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT);
                CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, workspace_id TEXT, content TEXT, scheduled_for TEXT, link_url TEXT, status TEXT, created_at TEXT);
                CREATE TABLE IF NOT EXISTS post_logs (id TEXT PRIMARY KEY, post_id TEXT, status TEXT, created_at TEXT);
                CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT);
                "
            ).expect("failed to run migrations");

            app.manage(DbState(Arc::new(Mutex::new(conn))));

            // tu scheduler de 60s aquí
            Ok(())
        })
       .invoke_handler(tauri::generate_handler![list_posts, create_post])
       .run(tauri::generate_context!())
       .expect("error while running tauri app");
}
