use axum::{
    Json,
    response::IntoResponse,
    http::HeaderMap,
    extract::State,
};
use serde_json::{json, Value};
use crate::AppState;
use posthog_rs::Event;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ScoreSignRequest {
    pub target_phrase: String,
    pub landmarks: Vec<Vec<f32>>,
}

pub async fn handler(
    State(state): State<AppState>,
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

    // Capture PostHog event
    let distinct_id = user_id.clone().unwrap_or_else(|| "anonymous".to_string());
    let mut event = Event::new("inference_requested", &distinct_id);
    event.insert_prop("target_phrase", &target).unwrap();
    event.insert_prop("frame_count", payload.landmarks.len()).unwrap();
    let _ = state.posthog.capture(event).await;

    // 2. Call local Python DTW Microservice
    let url = std::env::var("ML_SERVICE_URL").unwrap_or_else(|_| "http://ml:8000/predict".to_string());
    
    let client = reqwest::Client::new();
    let res = client.post(&url).json(&payload).send().await;

    match res {
        Ok(response) => {
            let status = response.status();
            let raw_text = response.text().await.unwrap_or_default();
            
            if !status.is_success() {
                let mut fail_event = Event::new("inference_failed", &distinct_id);
                fail_event.insert_prop("error", &raw_text).unwrap();
                fail_event.insert_prop("status", status.as_u16()).unwrap();
                let _ = state.posthog.capture(fail_event).await;

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
                .bind(&user_id)
                .bind(&Vec::<String>::new()) // Placeholder for candidates
                .execute(&state.pool)
                .await;

                // Capture completion event
                let mut done_event = Event::new("inference_completed", &distinct_id);
                done_event.insert_prop("target_phrase", &target).unwrap();
                done_event.insert_prop("similarity_score", score).unwrap();
                let _ = state.posthog.capture(done_event).await;

                // Capture sign_mastered if score >= 90 and it's the first time
                if score >= 90.0 {
                    if let Some(uid) = &user_id {
                        let prev_high_score = sqlx::query_scalar::<_, f64>(
                            "SELECT MAX(similarity_score) FROM sign_attempts WHERE user_id = $1 AND target_phrase = $2 AND created_at < NOW()"
                        )
                        .bind(uid)
                        .bind(&target)
                        .fetch_optional(&state.pool)
                        .await
                        .unwrap_or(None);

                        if prev_high_score.unwrap_or(0.0) < 90.0 {
                            let mut master_event = Event::new("sign_mastered", uid);
                            master_event.insert_prop("target_phrase", &target).unwrap();
                            master_event.insert_prop("score", score).unwrap();
                            let _ = state.posthog.capture(master_event).await;
                        }
                    }
                }

                Json(json_res).into_response()
            } else {
                let mut parse_fail = Event::new("inference_failed", &distinct_id);
                parse_fail.insert_prop("error", "JSON parsing failed").unwrap();
                let _ = state.posthog.capture(parse_fail).await;
                Json(json!({ "error": "Failed to parse DTW response" })).into_response()
            }
        },
        Err(e) => {
            let mut req_fail = Event::new("inference_failed", &distinct_id);
            req_fail.insert_prop("error", e.to_string()).unwrap();
            let _ = state.posthog.capture(req_fail).await;
            Json(json!({ "error": format!("Request to DTW engine failed: {}", e) })).into_response()
        }
    }
}
