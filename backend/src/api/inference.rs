use axum::{
    Json,
    response::IntoResponse,
    http::HeaderMap,
};
use serde_json::{json, Value};
use std::env;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ScoreSignRequest {
    pub target_word: String,
    pub landmarks: Vec<Vec<f32>>,
}

pub async fn handler(
    headers: HeaderMap,
    Json(payload): Json<ScoreSignRequest>,
) -> impl IntoResponse {
    let target = &payload.target_word;
    
    // We can extract the Clerk JWT here for actual progress tracking!
    let _auth_header = headers.get("Authorization").and_then(|h| h.to_str().ok());
    
    tracing::info!("Received score request for word: {}, frames: {}", target, payload.landmarks.len());

    // Call local Python DTW Microservice
    let url = std::env::var("ML_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000/predict".to_string());
    
    let client = reqwest::Client::new();
    let res = client.post(&url).json(&payload).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let raw_text = response.text().await.unwrap_or_default();
            
            if !status.is_success() {
                return Json(json!({ 
                    "error": format!("DTW Engine Error ({}): {}", status, raw_text) 
                })).into_response();
            }

            if let Ok(json_res) = serde_json::from_str::<Value>(&raw_text) {
                // Expecting {"similarity_score": 85.5, "feedback": "Great!"}
                Json(json_res).into_response()
            } else {
                Json(json!({ "error": "Failed to parse DTW response" })).into_response()
            }
        },
        Err(e) => Json(json!({ "error": format!("Request to DTW engine failed: {}", e) })).into_response()
    }
}
