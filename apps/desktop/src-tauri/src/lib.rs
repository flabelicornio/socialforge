use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
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

#[derive(Serialize, Deserialize, Debug)]
pub struct MediaItemInput {
    pub url: String,
    pub r#type: String,
    pub name: String,
}

#[derive(Deserialize, Debug)]
pub struct CreatePostInput {
    pub workspace_id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Vec<MediaItemInput>,
    pub scheduled_for: Option<i64>,
    pub link_url: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdatePostInput {
    pub id: String,
    pub text: String,
    pub platforms: Vec<String>,
    pub media_ids: Vec<MediaItemInput>,
    pub scheduled_for: Option<i64>,
    pub link_url: Option<String>,
}

fn get_app_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

fn load_posts_from_disk(app_handle: &tauri::AppHandle) -> Result<Vec<Post>, String> {
    let app_dir = get_app_dir(app_handle)?;
    let posts_file = app_dir.join("posts.json");
    if !posts_file.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(posts_file).map_err(|e| e.to_string())?;
    let posts: Vec<Post> = serde_json::from_str(&data).unwrap_or_default();
    Ok(posts)
}

fn save_posts_to_disk(app_handle: &tauri::AppHandle, posts: &[Post]) -> Result<(), String> {
    let app_dir = get_app_dir(app_handle)?;
    let posts_file = app_dir.join("posts.json");
    let json = serde_json::to_string_pretty(posts).map_err(|e| e.to_string())?;
    fs::write(posts_file, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_post(app_handle: tauri::AppHandle, input: CreatePostInput) -> Result<Post, String> {
    let mut posts = load_posts_from_disk(&app_handle)?;
    let now = chrono::Utc::now().timestamp_millis();

    let post = Post {
        id: format!("post_{}", now),
        workspace_id: input.workspace_id,
        text: input.text,
        platforms: serde_json::to_string(&input.platforms).unwrap_or_default(),
        media_ids: serde_json::to_string(&input.media_ids).unwrap_or_default(),
        scheduled_for: input.scheduled_for,
        status: "draft".to_string(),
        failure_reason: None,
        link_url: input.link_url,
        created_at: now,
        updated_at: now,
    };

    posts.push(post.clone());
    save_posts_to_disk(&app_handle, &posts)?;
    Ok(post)
}

#[tauri::command]
fn update_post(app_handle: tauri::AppHandle, input: UpdatePostInput) -> Result<Post, String> {
    let mut posts = load_posts_from_disk(&app_handle)?;
    let now = chrono::Utc::now().timestamp_millis();

    let pos = posts
        .iter()
        .position(|p| p.id == input.id)
        .ok_or_else(|| "Publicación no encontrada".to_string())?;

    let existing = &posts[pos];
    let updated_post = Post {
        id: existing.id.clone(),
        workspace_id: existing.workspace_id.clone(),
        text: input.text,
        platforms: serde_json::to_string(&input.platforms).unwrap_or_default(),
        media_ids: serde_json::to_string(&input.media_ids).unwrap_or_default(),
        scheduled_for: input.scheduled_for,
        status: existing.status.clone(),
        failure_reason: existing.failure_reason.clone(),
        link_url: input.link_url,
        created_at: existing.created_at,
        updated_at: now,
    };

    posts[pos] = updated_post.clone();
    save_posts_to_disk(&app_handle, &posts)?;
    Ok(updated_post)
}

#[tauri::command]
fn list_posts(app_handle: tauri::AppHandle, _workspace_id: String) -> Result<Vec<Post>, String> {
    load_posts_from_disk(&app_handle)
}

#[tauri::command]
fn delete_post(app_handle: tauri::AppHandle, id: String) -> Result<bool, String> {
    let mut posts = load_posts_from_disk(&app_handle)?;
    posts.retain(|p| p.id != id);
    save_posts_to_disk(&app_handle, &posts)?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_post,
            update_post,
            list_posts,
            delete_post
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}