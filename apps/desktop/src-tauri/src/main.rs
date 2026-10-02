// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use socialforge_desktop::{
    create_post_internal, delete_post_internal, facebook, init_db, list_posts_internal,
    update_post_internal, CreatePostInput, DbState, Post, UpdatePostInput,
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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_db(app.handle()).expect("Error al inicializar SQLite");
            app.manage(DbState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_post,
            list_posts,
            update_post,
            delete_post,
            facebook::get_facebook_auth_url,
            facebook::fetch_facebook_pages,
            facebook::publish_to_facebook_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}