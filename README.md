# 🤟 ASL Educator: High-Performance ML Learning Platform

ASL Educator is a production-grade American Sign Language learning platform that provides real-time AI feedback on your signing accuracy. It features a distributed architecture designed for low-latency inference and high-availability deployment.

**Live Site:** [bettersign.fyi](https://bettersign.fyi)

---

## 🏗 System Architecture

The application is split into four specialized services for maximum scalability and performance.

### 1. Frontend (Vercel)
*   **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS.
*   **AI Edge:** Uses **MediaPipe Holistic** in the browser to extract 1,662 3D landmarks (Face, Hands, Pose) from the user's webcam at 30fps.
*   **Mobile Optimized:** Features a responsive navigation system and touch-friendly interface for mobile learning.

### 2. Backend Gateway (Render - Rust)
*   **Instance:** Starter Tier (Always-On).
*   **Tech Stack:** Rust (Axum), Tokio, SQLx.
*   **Role:** Secure orchestrator. Validates Clerk JWTs, manages user statistics in Supabase, and proxies requests to the ML engine.

### 3. ML Inference Engine (Render - Python)
*   **Instance:** Starter Tier (Always-On).
*   **Algorithm:** Uses **Dynamic Time Warping (DTW)** with Cosine Distance.
*   **Just-in-Time Data:** Implements a "Lazy Loading" strategy—it boots instantly and pulls specific landmark data from R2 only when requested, keeping the memory footprint minimal.

### 4. Data Layer (Supabase & Cloudflare R2)
*   **Database:** Supabase (Postgres) stores encrypted sign attempts and global user stats.
*   **Blob Storage:** **Cloudflare R2** hosts the 1.5GB landmark dataset. This ensures the platform can scale its vocabulary to thousands of signs without Git repository bloat.

---

## 🧠 The ML Pipeline

### Temporal Spatial Scoring
Unlike traditional Neural Networks that require expensive GPU training, our engine uses **DTW (Dynamic Time Warping)**. This allows for:
*   **Speed Invariance:** It scores you correctly whether you sign fast or slow.
*   **Angle Agnostic:** By calculating similarity on relative joint angles (Cosine Distance), the AI focuses on the *shape* of your sign rather than your position in the camera frame.
*   **Granular Feedback:** Returns word-by-word scores for complex phrases (e.g., "Thank: 88% | You: 92%").

---

## 🛠 Developer Workflow

We use a modern GitOps pipeline for data and code:
1.  **Code:** Standard `git push` triggers Vercel and Render builds.
2.  **Data:** Landmarks are managed locally and synced to R2 via `./ml/sync_data.sh`.
3.  **Deployment:** Render services are configured with **Build Filters** (`ml/**` and `backend/**`) to ensure they only redeploy when their specific logic changes.

---

## 📂 Project Structure
```text
├── backend/            # Rust Axum Gateway (Auth & Stats)
├── frontend/           # React + Vite (Mobile-optimized UI)
├── ml/                 # Python Inference (DTW Engine & R2 Lazy-Loader)
├── ml/data/            # Reference Metadata (WLASL)
└── render.yaml         # Infrastructure as Code (Blueprint)
```

---

## 🚀 Scale & Performance
*   **Availability:** 24/7 (Always-On Starter Tiers)
*   **Vocabulary:** 494 Signs (R2 Distributed)
*   **Inference Latency:** ~200ms - 500ms
*   **Infrastructure Cost:** Minimal ($14/mo for dedicated compute)
