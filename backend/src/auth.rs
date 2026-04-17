use jsonwebtoken::{decode, decode_header, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use moka::future::Cache;
use std::sync::Arc;
use once_cell::sync::Lazy;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // Clerk User ID
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
struct Jwk {
    kid: String,
    n: String,
    e: String,
}

#[derive(Debug, Deserialize)]
struct JwksResponse {
    keys: Vec<Jwk>,
}

// Cache JWKS for 1 hour to avoid constant network calls
static JWKS_CACHE: Lazy<Cache<String, Arc<JwksResponse>>> = Lazy::new(|| {
    Cache::builder()
        .time_to_live(std::time::Duration::from_secs(3600))
        .build()
});

pub async fn verify_token(token: &str) -> Result<String, String> {
    let header = decode_header(token).map_err(|e| e.to_string())?;
    let kid = header.kid.ok_or("No kid in JWT header")?;

    let jwks_url = std::env::var("CLERK_JWKS_URL").map_err(|_| "CLERK_JWKS_URL not set")?;

    let jwks = if let Some(cached) = JWKS_CACHE.get(&jwks_url).await {
        cached
    } else {
        let resp = reqwest::get(&jwks_url).await.map_err(|e| e.to_string())?
            .json::<JwksResponse>().await.map_err(|e| e.to_string())?;
        let arc_jwks = Arc::new(resp);
        JWKS_CACHE.insert(jwks_url.clone(), arc_jwks.clone()).await;
        arc_jwks
    };

    let jwk = jwks.keys.iter().find(|k| k.kid == kid)
        .ok_or("No matching key found in JWKS")?;

    let decoding_key = DecodingKey::from_rsa_components(&jwk.n, &jwk.e).map_err(|e| e.to_string())?;
    
    let mut validation = Validation::new(Algorithm::RS256);
    // You can add more validation like audience/issuer if needed
    validation.validate_exp = true;

    let token_data = decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|e| e.to_string())?;

    Ok(token_data.claims.sub)
}
