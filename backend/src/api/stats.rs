use axum::{
    Json, 
    extract::State,
    http::HeaderMap,
};
use serde::{Serialize};
use sqlx::{PgPool, Row};

#[derive(Serialize, Debug, sqlx::FromRow)]
pub struct StatItem {
    pub label: String,
    pub count: i64,
}

#[derive(Serialize, Debug)]
pub struct StatsResponse {
    pub total_attempts: i64,
    pub avg_accuracy: f64,
    pub mastered_count: i64,
    pub global_percentile: f64,
    pub distribution: Vec<StatItem>,
}

pub async fn handler(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> Json<StatsResponse> {
    // 1. Verify Clerk JWT
    let token = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let user_id = match token {
        Some(t) => {
            match crate::auth::verify_token(t).await {
                Ok(uid) => Some(uid),
                Err(e) => {
                    tracing::error!("JWT Verification failed in stats: {}", e);
                    return Json(StatsResponse {
                        total_attempts: 0,
                        avg_accuracy: 0.0,
                        mastered_count: 0,
                        global_percentile: 0.0,
                        distribution: vec![],
                    });
                }
            }
        },
        None => {
            return Json(StatsResponse {
                total_attempts: 0,
                avg_accuracy: 0.0,
                mastered_count: 0,
                global_percentile: 0.0,
                distribution: vec![],
            });
        }
    };

    // 2. User Stats
    let user_stats_row = sqlx::query(
        r#"
        SELECT 
            COUNT(*)::bigint as total,
            COALESCE(AVG(similarity_score), 0.0)::float8 as avg_score,
            COUNT(*) FILTER (WHERE similarity_score >= 80)::bigint as mastered
        FROM sign_attempts
        WHERE user_id = $1
        "#
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await;

    let (total_attempts, avg_accuracy, mastered_count) = match user_stats_row {
        Ok(row) => (
            row.get::<i64, _>("total"),
            row.get::<f64, _>("avg_score"),
            row.get::<i64, _>("mastered")
        ),
        Err(_) => (0, 0.0, 0)
    };

    // 3. Global Percentile
    let percentile_row = sqlx::query(
        r#"
        WITH user_averages AS (
            SELECT AVG(similarity_score) as avg_score
            FROM sign_attempts
            WHERE user_id IS NOT NULL
            GROUP BY user_id
        )
        SELECT 
            (SELECT COUNT(*) FROM user_averages WHERE avg_score <= $1)::float8 / 
            NULLIF((SELECT COUNT(*) FROM user_averages), 0)::float8 * 100.0 as percentile
        "#
    )
    .bind(avg_accuracy)
    .fetch_one(&pool)
    .await;

    let percentile_val = match percentile_row {
        Ok(row) => row.get::<Option<f64>, _>("percentile").unwrap_or(0.0),
        Err(_) => 0.0
    };
    let global_percentile = (100.0 - percentile_val).max(1.0);

    // 4. Word Distribution (Personal)
    let distribution = sqlx::query_as::<_, StatItem>(
        r#"
        SELECT 
            LOWER(target_phrase) as label, 
            COUNT(*)::bigint as count
        FROM sign_attempts
        WHERE user_id = $1 AND target_phrase IS NOT NULL
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 10
        "#
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await;

    let distribution = match distribution {
        Ok(d) => {
            tracing::info!("Stats: Found {} distribution items for user {:?}", d.len(), &user_id);
            d
        },
        Err(e) => {
            tracing::error!("Stats: Distribution query failed: {:?}", e);
            vec![]
        }
    };

    Json(StatsResponse {
        total_attempts,
        avg_accuracy,
        mastered_count,
        global_percentile,
        distribution,
    })
}
