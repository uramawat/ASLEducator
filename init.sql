CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sign_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_phrase TEXT,
    similarity_score FLOAT8,
    user_id TEXT,
    candidates TEXT[] NOT NULL DEFAULT '{}',
    selected_candidate TEXT,
    user_correction TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    user_ip INET,
    video_id UUID
);
