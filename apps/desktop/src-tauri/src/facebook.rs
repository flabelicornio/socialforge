use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const FACEBOOK_APP_ID: &str = "1245604221092071";
pub const REDIRECT_URI: &str = "https://socialforge.latamstudios.com/oauth/facebook/callback";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FacebookPage {
    pub id: String,
    pub name: String,
    pub access_token: String,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FacebookPagesResponse {
    pub data: Vec<FacebookPage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostResponse {
    pub id: String,
}

/// Genera la URL limpia para iniciar la autenticación en Meta Graph API
pub fn get_facebook_auth_url() -> String {
    let scope = urlencoding::encode(
        "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management"
    );
    format!(
        "https://www.facebook.com/v26.0/dialog/oauth?client_id={}&redirect_uri={}&scope={}&response_type=token",
        FACEBOOK_APP_ID,
        urlencoding::encode(REDIRECT_URI),
        scope
    )
}

/// Consulta a Meta las páginas administradas por el usuario usando el User Access Token
pub async fn fetch_user_pages(user_access_token: &str) -> Result<Vec<FacebookPage>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v26.0/me/accounts?access_token={}",
        user_access_token
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error de red al consultar páginas: {}", e))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("Error de Graph API al obtener páginas: {}", err_text));
    }

    let pages_resp: FacebookPagesResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al deserializar páginas de Meta: {}", e))?;

    Ok(pages_resp.data)
}

/// Realiza la publicación POST en el feed de la página de Facebook
pub async fn publish_to_facebook_page(
    page_id: &str,
    page_access_token: &str,
    message: &str,
    link_url: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://graph.facebook.com/v26.0/{}/feed", page_id);

    let mut params = HashMap::new();
    params.insert("message", message.to_string());
    params.insert("access_token", page_access_token.to_string());

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
        .map_err(|e| format!("Error de red al publicar en Facebook: {}", e))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("Error de Graph API al publicar: {}", err_text));
    }

    let post_res: PostResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al deserializar respuesta de publicación: {}", e))?;

    Ok(post_res.id)
}