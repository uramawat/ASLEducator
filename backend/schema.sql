-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE sign_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- The choices AI gave
    candidates TEXT[] NOT NULL,
    
    -- The User's feedback
    selected_candidate TEXT, -- NULL if they haven't chosen yet
    user_correction TEXT,    -- Populated if they chose "None of these" and typed strict input
    
    -- Performance Tracking
    is_correct BOOLEAN DEFAULT FALSE, -- True if selected_candidate matches target (if we had a target) OR if they picked one of the AI guesses
    
    -- Metadata
    user_ip INET -- For rate limiting / abuse analysis
);
