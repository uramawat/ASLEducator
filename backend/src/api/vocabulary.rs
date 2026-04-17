use axum::{
    Json,
    response::IntoResponse,
};
use serde_json::{json, Value};

pub async fn handler() -> impl IntoResponse {
    let url = std::env::var("ML_SERVICE_URL")
        .unwrap_or_else(|_| "http://ml:8000/predict".to_string())
        .replace("/predict", "/health");
    
    let client = reqwest::Client::new();
    let res = client.get(&url).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let raw_text = response.text().await.unwrap_or_default();
            
            if !status.is_success() {
                return Json(json!({ 
                    "error": format!("ML Health Check Error ({}): {}", status, raw_text) 
                })).into_response();
            }

            if let Ok(json_res) = serde_json::from_str::<Value>(&raw_text) {
                // Return both words and mapping
                let words = json_res.get("available_words").cloned().unwrap_or(json!([]));
                let mapping = json_res.get("youtube_mapping").cloned().unwrap_or(json!({}));
                
                tracing::info!("ML Health Check returned {} words and {} YT links", 
                    words.as_array().map(|a| a.len()).unwrap_or(0),
                    mapping.as_object().map(|m| m.len()).unwrap_or(0)
                );
                
                Json(json!({ 
                    "available_words": words,
                    "youtube_mapping": mapping
                })).into_response()
            } else {
                Json(json!({ "error": "Failed to parse ML response" })).into_response()
            }
        },
        Err(e) => Json(json!({ "error": format!("Request to ML service failed: {}", e) })).into_response()
    }
}
