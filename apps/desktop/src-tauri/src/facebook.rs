use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const FB_APP_ID: &str = "1245604221092071";
const REDIRECT_URI: &str = "https://socialforge.latamstudios.com/oauth/facebook/callback";

#[derive(Debug, Serialize, Deserialize)]
pub struct FacebookAuthUrlResponse {
    pub auth_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FacebookPublishResponse {
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FacebookPageInfo {
    pub id: String,
    pub name: String,
    pub access_token: String,
}

#[derive(Debug, Deserialize)]
struct FacebookPagesResponse {
    pub data: Vec<FacebookPageInfo>,
}

#[tauri::command]
pub fn get_facebook_auth_url() -> FacebookAuthUrlResponse {
    let scopes = vec![
        "business_management",
        "instagram_basic",
        "instagram_content_publish",
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_read_user_content",
        "pages_show_list",
    ];

    let auth_url = format!(
        "https://www.facebook.com/v26.0/dialog/oauth?client_id={}&redirect_uri={}&scope={}&response_type=token",
        FB_APP_ID,
        urlencoding::encode(REDIRECT_URI),
        scopes.join(",")
    );

    FacebookAuthUrlResponse { auth_url }
}

pub async fn get_user_pages(user_access_token: &str) -> Result<Vec<FacebookPageInfo>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v26.0/me/accounts?access_token={}",
        user_access_token
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error en la petición de red: {}", e))?;

    if response.status().is_success() {
        let res_json: FacebookPagesResponse = response
            .json()
            .await
            .map_err(|e| format!("Error deserializando páginas de Facebook: {}", e))?;
        Ok(res_json.data)
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Error desconocido de la API".to_string());
        Err(format!("Error devuelto por Facebook API: {}", error_text))
    }
}

#[tauri::command]
pub async fn publish_to_facebook_page(
    page_id: String,
    page_access_token: String,
    message: String,
    link_url: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://graph.facebook.com/v26.0/{}/feed", page_id);

    let mut params = HashMap::new();
    params.insert("message", message);
    params.insert("access_token", page_access_token);

    if let Some(link) = link_url {
        if !link.trim().is_empty() {
            params.insert("link", link);
        }
    }

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error en la petición de red: {}", e))?;

    if response.status().is_success() {
        let res_json: FacebookPublishResponse = response
            .json()
            .await
            .map_err(|e| format!("Error deserializando respuesta de Facebook: {}", e))?;
        Ok(res_json.id)
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Error desconocido de la API".to_string());
        Err(format!("Error devuelto por Facebook API: {}", error_text))
    }
}