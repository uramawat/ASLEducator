use sqlx::{postgres::PgPoolOptions, Connection, PgConnection, Executor};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting Database Setup...");
    
    // 1. Connect to default 'postgres' database to create the new DB
    let default_url = "postgres://ramawat:postgres@localhost/postgres";
    
    println!("Connecting to default database: {}", default_url);
    // Use a single connection for the admin task
    let conn = PgConnection::connect(default_url).await;
    
    if let Err(_e) = &conn {
        println!("Failed to connect to default DB 'postgres'. Attempting 'template1'...");
        // Fallback to template1 if postgres db doesn't exist (rare but possible) or different auth
    }

    // Determine connection to use for creation
    let mut conn = match conn {
        Ok(c) => c,
        Err(_) => PgConnection::connect("postgres://ramawat:postgres@localhost/template1").await?
    };

    // 2. Create Database (if not exists)
    // We cannot use "IF NOT EXISTS" with CREATE DATABASE easily in one query in all versions, 
    // but we can check catalog. simpler: just try and ignore error.
    println!("Creating database 'aslexperiment'...");
    let _ = conn.execute("CREATE DATABASE aslexperiment").await;
    
    // Close admin connection
    let _ = conn.close().await;

    // 3. Connect to the new database
    let db_url = "postgres://ramawat:postgres@localhost/aslexperiment";
    println!("Connecting to new database: {}", db_url);
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(db_url).await?;

    // 4. Run Schema
    println!("Applying schema...");
    let schema = r#"
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS sign_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        candidates TEXT[] NOT NULL,
        selected_candidate TEXT,
        user_correction TEXT,
        is_correct BOOLEAN DEFAULT FALSE,
        user_ip INET
    );
    "#;

    pool.execute(schema).await?;
    
    println!("✅ Database 'aslexperiment' setup complete!");
    Ok(())
}
