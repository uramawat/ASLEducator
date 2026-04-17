# Codebase Structure

**Analysis Date:** 2025-02-14

## Directory Layout

```
ASLExperiment/
├── backend/            # Rust Axum API (Gateway/Persistence)
│   ├── src/
│   │   ├── main.rs     # Server entry point
│   │   ├── api/        # API route handlers
│   │   └── bin/        # Utility binaries (setup_db)
│   └── storage/        # Persistent file storage (videos)
├── frontend/           # React/Vite/TS UI
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── App.tsx     # Main application shell
│   │   └── main.tsx    # React entry point
├── ml/                 # Python FastAPI ML Service
│   ├── data/           # WLASL Reference data (npy & videos)
│   ├── models/         # (Optional) Trained ML model files
│   ├── main.py         # ML Service entry point
│   └── dtw_engine.py   # Core similarity logic
├── docker-compose.yml  # Multi-service orchestration
├── init.sql           # Database schema initialization
└── run_ml_pipeline.sh  # Script to regenerate reference landmarks
```

## Directory Purposes

**`backend/src/api/`:**
- Purpose: Logic for handling incoming REST requests.
- Contains: Route handlers for inference, feedback, statistics, and vocabulary lookup.
- Key files: `backend/src/api/inference.rs`, `backend/src/api/feedback.rs`, `backend/src/api/vocabulary.rs`.

**`frontend/src/components/`:**
- Purpose: Encapsulated React components for the UI.
- Contains: Camera capture logic, MediaPipe canvas drawing, stats views, and vocabulary index.
- Key files: `frontend/src/components/CameraRecorder.tsx`, `frontend/src/components/MediaPipeCanvas.tsx`, `frontend/src/components/VocabularyIndex.tsx`.

**`ml/data/landmarks/`:**
- Purpose: Pre-processed expert landmark data from the WLASL dataset.
- Contains: Subdirectories per word, each containing `.npy` files.
- Key files: `ml/data/landmarks/about/001.npy`.

## Key File Locations

**Entry Points:**
- `backend/src/main.rs`: Axum server setup.
- `ml/main.py`: FastAPI server setup.
- `frontend/src/main.tsx`: React mounting point.

**Configuration:**
- `docker-compose.yml`: Infrastructure and service definition.
- `backend/Cargo.toml`: Rust dependencies.
- `frontend/package.json`: Node dependencies.
- `ml/pyproject.toml`: Python dependencies (using uv).

**Core Logic:**
- `ml/dtw_engine.py`: Sequence comparison algorithm.
- `ml/tune_thresholds.py`: Statistical analysis tool for EER thresholding.
- `backend/src/api/inference.rs`: Cross-service proxy logic.
- `frontend/src/components/MediaPipeCanvas.tsx`: Landmark extraction logic.

**Testing:**
- `ml/test_dtw.py`: Unit tests for the DTW logic.
- `ml/simulate.py`: Script to simulate sign attempts against the ML service.

## Naming Conventions

**Files:**
- Rust: `snake_case.rs`
- Python: `snake_case.py`
- TypeScript/React: `PascalCase.tsx` for components, `camelCase.ts` for logic.

**Directories:**
- All: `snake_case` or `lowercase`.

## Where to Add New Code

**New Feature (UI):**
- Implementation: Add to `frontend/src/components/` if it's a UI element.
- Wiring: Integrate into `frontend/src/App.tsx`.

**New API Endpoint:**
- Backend Implementation: Create a new file in `backend/src/api/` and register it in `backend/src/main.rs`.
- ML Support: If it requires new inference logic, add an endpoint to `ml/main.py`.

**New Sign/Vocabulary:**
- Automatic: Add the reference video to `ml/data/videos/[word]/` and run `./run_ml_pipeline.sh` to extract landmarks into `ml/data/landmarks/`.

## Special Directories

**`.planning/`:**
- Purpose: Stores project documentation, analysis, and implementation plans.
- Committed: Yes.

**`backend/target/` / `frontend/node_modules/` / `ml/.venv/`:**
- Purpose: Build artifacts and environment dependencies.
- Committed: No.

---

*Structure analysis: 2025-02-14*
