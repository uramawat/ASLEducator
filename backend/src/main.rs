use axum::{
    routing::{post, get},
    extract::DefaultBodyLimit,
    Router,
};
use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_governor::{governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor, GovernorLayer};
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;

#[tokio::main]
async fn main() {
    dotenv().ok();
    
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 1. Per-IP Limit: Burst 5, Refill 1 every 10 seconds.
    // This isn't a perfect "daily quota", but it prevents abuse/loops.
    // 6 request burst, then 1 per 10s.
    let ip_conf = Arc::new(GovernorConfigBuilder::default()
        .per_second(2) // This is actually "refill rate". 2 per second is too fast.
        // We want slower. Governor builder has .period()
        .period(std::time::Duration::from_secs(10)) 
        .burst_size(5)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap());

    // 3. Database Connection
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::PgPool::connect(&db_url).await.expect("Failed to connect to DB");

    let app = Router::new()
        .route("/", get(|| async { "ASLExperiment Backend API" }))
        .route("/api/score_sign", post(api::inference::handler))
        .route("/api/feedback", post(api::feedback::handler))
        .route("/api/stats", get(api::stats::handler))
        .with_state(pool)
        .layer(DefaultBodyLimit::max(1024 * 1024 * 50)) // 50 MB limit for massive coordinate tensors
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::permissive())
                // Basic IP governance
                .layer(GovernorLayer { config: ip_conf })
        );

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
}
