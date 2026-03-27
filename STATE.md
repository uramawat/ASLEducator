# Project State: ASLExperiment

**Date:** 2026-03-27
**Status:** Baseline implementation complete, uncommitted.

## Accomplishments
- **Architecture:** Established a three-tier microservices architecture (React Frontend, Rust Backend, Python ML Service).
- **Frontend:**
  - Integrated Clerk for authentication.
  - Implemented `MediaPipeCanvas` for real-time landmark extraction (Pose, Face, Hands).
  - Implemented `Educator` UI for sign practice and feedback visualization.
  - **Refactor:** Updated `Educator.tsx` to use `VITE_API_URL` environment variable.
  - **Refactor:** Unified recording logic in `MediaPipeCanvas` (removed auto-stop for manual control).
- **Backend:**
  - Rust/Axum server with routes for inference, feedback, and stats.
  - Proxy logic to forward landmark data to the ML service.
  - PostgreSQL integration for storing sign attempts and feedback.
- **ML:**
  - Python/FastAPI service using Dynamic Time Warping (DTW) for sign similarity scoring.
  - Reference landmark dataset structure established.
- **Orchestration:** Docker Compose configuration for local development.

## Current Goals
- Commit the baseline implementation to the repository.
- Verify the end-to-end flow using Docker.

## Risks & Concerns
- **Validation:** End-to-end flow has not been verified with the latest refactorings.
- **No Commits:** The repository is currently in an "empty" state despite having all files.

## Next Steps
1. **Commit Baseline:** Stage and commit all existing files.
2. **Validation:** Run `docker-compose up` and verify the full sign-practice-feedback cycle.
