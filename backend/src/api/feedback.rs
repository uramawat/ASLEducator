use axum::{Json, extract::State};
use serde::{Deserialize};
use serde_json::{json, Value};
use sqlx::{types::ipnetwork::IpNetwork};
use axum_client_ip::InsecureClientIp;
use crate::AppState;
use posthog_rs::Event;

#[derive(Deserialize, Debug)]
pub struct FeedbackRequest {
    pub candidates: Vec<String>,
    pub selected_candidate: Option<String>,
    pub user_correction: Option<String>,
    pub is_correct: bool,
    pub video_id: Option<String>, // UUID string from frontend
}

pub async fn handler(
    State(state): State<AppState>,
    InsecureClientIp(ip): InsecureClientIp,
    Json(payload): Json<FeedbackRequest>,
) -> Json<Value> {
    tracing::info!("Received feedback: {:?}", payload);
    
    let video_uuid = payload.video_id
        .as_ref()
        .and_then(|v| uuid::Uuid::parse_str(v).ok());

    // Insert into DB
    let result = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO sign_attempts (candidates, selected_candidate, user_correction, is_correct, user_ip, video_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#
    )
    .bind(&payload.candidates)
    .bind(&payload.selected_candidate)
    .bind(&payload.user_correction)
    .bind(payload.is_correct)
    .bind(IpNetwork::from(ip))
    .bind(video_uuid)
    .fetch_one(&state.pool)
    .await;

    // Capture PostHog event
    let mut event = Event::new("feedback_submitted", &ip.to_string());
    event.insert_prop("is_correct", payload.is_correct).unwrap();
    if let Some(ref corrected) = payload.user_correction {
        event.insert_prop("user_correction", corrected).unwrap();
    }
    let _ = state.posthog.capture(event).await;

    match result {
        Ok(id) => Json(json!({ "status": "success", "id": id })),
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            Json(json!({ "status": "error", "message": "Failed to save feedback" }))
        }
    }
}
