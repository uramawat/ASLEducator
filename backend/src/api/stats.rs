use axum::{Json, extract::State};
use serde::{Serialize};
use sqlx::PgPool;

#[derive(Serialize, Debug, sqlx::FromRow)]
pub struct StatItem {
    pub label: String,
    pub count: i64,
}

#[derive(Serialize, Debug)]
pub struct StatsResponse {
    pub total_samples: i64,
    pub distribution: Vec<StatItem>,
}

pub async fn handler(
    State(pool): State<PgPool>,
) -> Json<StatsResponse> {
    // 1. Get Total Count (where is_correct = true OR user provided correction)
    // Actually, any feedback entry that has a selected_candidate OR user_correction is a "labeled sample".
    let total_count: i64 = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)::bigint 
        FROM sign_attempts 
        WHERE selected_candidate IS NOT NULL OR user_correction IS NOT NULL
        "#
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let distribution = sqlx::query_as::<_, StatItem>(
        r#"
        SELECT 
            LOWER(COALESCE(user_correction, selected_candidate)) as label, 
            COUNT(*)::bigint as count
        FROM sign_attempts
        WHERE selected_candidate IS NOT NULL OR user_correction IS NOT NULL
        GROUP BY label
        ORDER BY count DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(StatsResponse {
        total_samples: total_count,
        distribution,
    })
}
