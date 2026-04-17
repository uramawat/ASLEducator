# Architecture

**Analysis Date:** 2025-02-14

## Pattern Overview

**Overall:** Microservices with a Central API Gateway

**Key Characteristics:**
- **Decoupled Logic:** The ML inference (Python) is separated from the API and persistence layer (Rust).
- **Client-Side Heavy Capture:** Video processing and landmark extraction happen in the browser using MediaPipe.
- **Reference-Based Evaluation:** DTW (Dynamic Time Warping) is used to compare user landmarks against a pre-compiled dataset of expert signs (WLASL).
- **Target Sentence Alignment (New):** For multi-word phrases, the ML service employs a sequential greedy sliding window. It segments the user's continuous capture by finding the optimal DTW match for each word in the requested order.

## Layers

**Frontend (Client Layer):**
- Purpose: Provides the user interface, captures webcam video, extracts 3D landmarks, and displays feedback.
- Location: `frontend/`
- Contains: React components, MediaPipe integration, Axios for API calls.
- Depends on: Backend API (`VITE_API_URL`).
- Used by: End users.

**Backend (API Gateway & Persistence Layer):**
- Purpose: Orchestrates requests between the frontend and the ML service, manages the PostgreSQL database, and handles general API concerns (CORS, rate limiting).
- Location: `backend/`
- Contains: Axum routes, sqlx database logic, and reqwest proxying to the ML service.
- Depends on: ML Service, PostgreSQL.
- Used by: Frontend.

**ML Service (Inference Layer):**
- Purpose: Performs the heavy lifting of signal processing and sequence comparison (DTW).
- Location: `ml/`
- Contains: FastAPI endpoints, DTW engine (with EER-based thresholding ~0.126), and WLASL reference data loading.
- Depends on: Local reference landmarks (`ml/data/landmarks/*.npy`).
- Used by: Backend.

**Database (Storage Layer):**
- Purpose: Stores user feedback and sign attempts for analytics and future retraining.
- Location: `init.sql` (Schema)
- Contains: `sign_attempts` table.
- Depends on: PostgreSQL instance.
- Used by: Backend.

## Data Flow

**Inference Flow:**

1. **Frontend**: Captures webcam stream and extracts landmarks using MediaPipe.
2. **Frontend**: Sends target phrase (word or sentence) and landmark sequence to `POST /api/score_sign` on the Backend.
3. **Backend**: Proxies the request to `POST /predict` on the ML Service.
4. **ML Service**: Splits phrase into words. For each word, it searches for the best window in the remaining capture.
5. **ML Service**: Returns a combined similarity score and per-word feedback to the Backend.
6. **Backend**: Saves attempt to PostgreSQL (`target_phrase` column) and returns response to the Frontend.

**Vocabulary Discovery Flow:**

1. **Frontend**: Accesses `VocabularyIndex` component.
2. **Backend**: Receives `GET /api/vocabulary` and proxies to ML Service `GET /health`.
3. **ML Service**: Scans `data/landmarks` directory and returns a sorted list of available sign folders.
4. **Frontend**: Displays alphabetical index grouped by letter.

**Feedback Flow:**

1. **Frontend**: Allows user to indicate if the prediction was correct or provide a correction.
2. **Frontend**: Sends feedback data to `POST /api/feedback` on the Backend.
3. **Backend**: Saves the feedback and sign metadata into the PostgreSQL `sign_attempts` table.

## Key Abstractions

**Landmark Sequence:**
- Purpose: A 2D array (`list[list[float]]`) representing the temporal progression of 3D coordinates (x, y, z) for hands and body.
- Examples: `ml/main.py` (ScoreSignRequest), `backend/src/api/inference.rs` (ScoreSignRequest).

**DTW Engine:**
- Purpose: Calculates the "distance" between two time-series of unequal length, allowing for variation in signing speed.
- Examples: `ml/dtw_engine.py`.

## Entry Points

**Frontend Application:**
- Location: `frontend/src/main.tsx`
- Triggers: User opening the application in a browser.
- Responsibilities: Initializing the React app and mounting the main `App.tsx`.

**Backend Server:**
- Location: `backend/src/main.rs`
- Triggers: Docker container start.
- Responsibilities: Setting up the Axum server, database pool, and routing.

**ML Service:**
- Location: `ml/main.py`
- Triggers: Docker container start.
- Responsibilities: Initializing the FastAPI application and exposing the inference endpoint.

## Error Handling

**Strategy:** Multi-level propagation.

**Patterns:**
- **Rust (Backend)**: Uses `Result<T, E>` and `match` statements to handle database failures or ML service timeouts, returning structured JSON errors to the frontend.
- **Python (ML)**: Uses try-except blocks in FastAPI routes to return 400/500 HTTP statuses with descriptive error messages.

## Cross-Cutting Concerns

**Logging:** Centralized using `tracing` in Rust and standard `logging`/`traceback` in Python.
**Validation:** Pydantic (Python) and Serde (Rust) ensure type-safe data transfer between services.
**Orchestration:** Docker Compose manages service discovery and network isolation.

---

*Architecture analysis: 2025-02-14*
