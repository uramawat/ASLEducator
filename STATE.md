# Project State: ASLExperiment

**Date:** 2026-03-27
**Status:** Baseline implementation complete and committed.

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
- **Source Control:** Initial baseline committed.

## Current Goals
- Verify the end-to-end flow using Docker.

## Risks & Concerns
- **Validation:** End-to-end flow has not been verified with the latest refactorings.

## Next Steps
1. **Validation:** Run `docker-compose up` and verify the full sign-practice-feedback cycle.
