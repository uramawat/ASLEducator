use axum::{
    Json,
    response::IntoResponse,
};
use serde_json::{json, Value};

pub async fn handler() -> impl IntoResponse {
    let url = std::env::var("ML_SERVICE_URL")
        .unwrap_or_else(|_| "http://ml:8000/predict".to_string())
        .replace("/predict", "/health");
    
    tracing::info!("DEBUG: Fetching vocabulary from: {}", url);
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap();
        
    let res = client.get(&url).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let raw_text = response.text().await.unwrap_or_default();
            
            if !status.is_success() {
                tracing::error!("DEBUG: ML Health check failed status: {}. Body: {}", status, raw_text);
                return Json(json!({ 
                    "error": format!("ML Health Check Error ({}): {}", status, raw_text) 
                })).into_response();
            }

            if let Ok(json_res) = serde_json::from_str::<Value>(&raw_text) {
                // Return both words and mapping
                let words = json_res.get("available_words").cloned().unwrap_or(json!([]));
                let mapping = json_res.get("youtube_mapping").cloned().unwrap_or(json!({}));
                
                tracing::info!("DEBUG: ML Health Success: Found {} words", 
                    words.as_array().map(|a| a.len()).unwrap_or(0)
                );
                
                Json(json!({ 
                    "available_words": words,
                    "youtube_mapping": mapping
                })).into_response()
            } else {
                tracing::error!("DEBUG: Failed to parse ML JSON. Raw body: {}", raw_text);
                Json(json!({ "error": "Failed to parse ML response" })).into_response()
            }
        },
        Err(e) => {
            tracing::error!("DEBUG: Request to ML service FAILED: {:?}. URL was: {}", e, url);
            Json(json!({ "error": format!("Request to ML service failed: {}", e) })).into_response()
        }
    }
}
