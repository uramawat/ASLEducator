use axum::{
    Json,
    response::IntoResponse,
    http::HeaderMap,
    extract::State,
};
use serde_json::{json, Value};
use sqlx::PgPool;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ScoreSignRequest {
    pub target_phrase: String,
    pub landmarks: Vec<Vec<f32>>,
}

pub async fn handler(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<ScoreSignRequest>,
) -> impl IntoResponse {
    let target = payload.target_phrase.clone();
    
    // 1. Verify Clerk JWT
    let token = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let user_id = match token {
        Some(t) => {
            match crate::auth::verify_token(t).await {
                Ok(uid) => Some(uid),
                Err(e) => {
                    tracing::error!("JWT Verification failed: {}", e);
                    None
                }
            }
        },
        None => None
    };
    
    tracing::info!("Received score request for phrase: {}, frames: {}, user: {:?}", target, payload.landmarks.len(), user_id);

    // 2. Call local Python DTW Microservice
    let url = std::env::var("ML_SERVICE_URL").unwrap_or_else(|_| "http://ml:8000/predict".to_string());
    
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
                // 3. Save to database
                let score = json_res.get("similarity_score")
                    .and_then(|s| s.as_f64())
                    .unwrap_or(0.0);
                
                let _ = sqlx::query(
                    r#"
                    INSERT INTO sign_attempts (target_phrase, similarity_score, user_id, candidates)
                    VALUES ($1, $2, $3, $4)
                    "#
                )
                .bind(&target)
                .bind(score)
                .bind(user_id)
                .bind(&Vec::<String>::new()) // Placeholder for candidates
                .execute(&pool)
                .await;

                Json(json_res).into_response()
            } else {
                Json(json!({ "error": "Failed to parse DTW response" })).into_response()
            }
        },
        Err(e) => Json(json!({ "error": format!("Request to DTW engine failed: {}", e) })).into_response()
    }
}
