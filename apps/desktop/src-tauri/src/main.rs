// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use socialforge_desktop::{
    create_post_internal, delete_post_internal, facebook, init_db, list_accounts_internal,
    list_posts_internal, save_facebook_account_internal, start_scheduler, update_post_internal,
    Account, CreatePostInput, DbState, Post, UpdatePostInput,
};
use std::sync::Mutex;
use tauri::{Manager, State};

#[tauri::command]
fn create_post(state: State<'_, DbState>, input: CreatePostInput) -> Result<Post, String> {
    create_post_internal(state, input)
}

#[tauri::command]
fn list_posts(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Post>, String> {
    list_posts_internal(state, workspace_id)
}

#[tauri::command]
fn update_post(state: State<'_, DbState>, input: UpdatePostInput) -> Result<Post, String> {
    update_post_internal(state, input)
}

#[tauri::command]
fn delete_post(state: State<'_, DbState>, id: String) -> Result<(), String> {
    delete_post_internal(state, id)
}

#[tauri::command]
fn list_accounts(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Account>, String> {
    list_accounts_internal(state, workspace_id)
}

#[tauri::command]
fn save_facebook_account(
    state: State<'_, DbState>,
    workspace_id: String,
    user_access_token: String,
) -> Result<Account, String> {
    save_facebook_account_internal(state, workspace_id, user_access_token)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_db(app.handle()).expect("Error al inicializar SQLite");
            app.manage(DbState {
                db: Mutex::new(conn),
            });

            // Inicia el scheduler de tareas en segundo plano
            start_scheduler(app.handle().clone());

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_post,
            list_posts,
            update_post,
            delete_post,
            list_accounts,
            save_facebook_account,
            facebook::get_facebook_auth_url,
            facebook::publish_to_facebook_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}