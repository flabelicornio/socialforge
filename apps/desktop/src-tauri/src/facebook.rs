use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

const FB_APP_ID: &str = "1245604221092071";
const REDIRECT_URI: &str = "https://socialforge.latamstudios.com/oauth/facebook/callback";

// Estructura para representar cuentas conectadas
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectedAccount {
    pub id: String,
    pub platform: String,
    pub account_name: String,
    pub access_token: String,
    pub is_connected: bool,
}

// Almacenamiento en memoria para tokens y cuentas vinculadas
static CONNECTED_ACCOUNTS: Mutex<Vec<ConnectedAccount>> = Mutex::new(Vec::new());

#[derive(Debug, Serialize, Deserialize)]
pub struct FacebookAuthUrlResponse {
    pub auth_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FacebookPublishResponse {
    pub id: String,
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

    // Usamos response_type=token para el flujo implícito adecuado para clientes Desktop/SPA
    let auth_url = format!(
        "https://www.facebook.com/v26.0/dialog/oauth?client_id={}&redirect_uri={}&scope={}&response_type=token",
        FB_APP_ID,
        urlencoding::encode(REDIRECT_URI),
        scopes.join(",")
    );

    FacebookAuthUrlResponse { auth_url }
}

#[tauri::command]
pub fn get_connected_accounts() -> Result<Vec<ConnectedAccount>, String> {
    let accounts = CONNECTED_ACCOUNTS
        .lock()
        .map_err(|e| format!("Error al acceder al estado de cuentas: {}", e))?;
    Ok(accounts.clone())
}

#[tauri::command]
pub fn save_facebook_token(user_access_token: String) -> Result<Vec<ConnectedAccount>, String> {
    let mut accounts = CONNECTED_ACCOUNTS
        .lock()
        .map_err(|e| format!("Error guardando token: {}", e))?;

    // Actualiza o inserta la cuenta de Facebook
    if let Some(acc) = accounts.iter_mut().find(|a| a.platform == "facebook") {
        acc.access_token = user_access_token.clone();
        acc.is_connected = true;
        acc.account_name = "Página de Facebook Vinculada".to_string();
    } else {
        accounts.push(ConnectedAccount {
            id: "fb_1".to_string(),
            platform: "facebook".to_string(),
            account_name: "Página de Facebook Vinculada".to_string(),
            access_token: user_access_token,
            is_connected: true,
        });
    }

    Ok(accounts.clone())
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