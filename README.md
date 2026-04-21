# 🤟 ASL Educator: High-Performance ML on a $0 Budget

ASL Educator is a production-grade American Sign Language learning platform that provides real-time AI feedback on your signing accuracy. It features a distributed architecture designed to handle heavy ML workloads while maintaining a **$0.00/month infrastructure cost**.

**Live Demo:** [bettersign.fyi](https://bettersign.fyi)

---

## 🏗 System Architecture

The application is split into four distinct specialized services to maximize performance and stay within free-tier cloud limits.

### 1. Frontend (Vercel)
*   **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS.
*   **AI Edge:** Uses **MediaPipe Holistic** in the browser to extract 1,662 3D landmarks (Face, Hands, Pose) from the user's webcam at 30fps.
*   **Auth:** Integrated with **Clerk** (Production Instance) for secure user management and Google OAuth.

### 2. Backend Gateway (Render - Rust)
*   **Tech Stack:** Rust, Axum, Tokio, SQLx.
*   **Role:** Acts as a secure "Bridge." It validates Clerk JWTs, manages user statistics in Supabase, and orchestrates requests to the internal ML engine.
*   **Performance:** Uses a 5-minute timeout window to accommodate cold starts on the ML microservice.

### 3. ML Inference Engine (Render - Python)
*   **Tech Stack:** Python 3.11, FastAPI, NumPy, SciPy, FastDTW.
*   **Algorithm:** Uses **Dynamic Time Warping (DTW)** with Cosine Distance. It compares the user's motion "shape" against a bank of 494 expert reference signs.
*   **Optimization:** The production image is "pruned" of heavy libraries like TensorFlow/OpenCV, reducing RAM usage from 1.2GB to <200MB to fit Render's Free Tier.

### 4. Data Layer (Supabase & Cloudflare R2)
*   **Database:** Supabase (Postgres) stores user sign attempts and global rankings.
*   **Blob Storage:** **Cloudflare R2** hosts 1.5GB of `.npy` landmark files. This bypasses GitHub LFS limits and ensures the ML service can scale its vocabulary indefinitely for free.

---

## 🧠 The ML Pipeline: From Video to Feedback

The core of the app is a custom-built ML pipeline that processes temporal spatial data.

### Step 1: Data Extraction
We processed the **WLASL (World Level ASL)** dataset. A local pipeline script used MediaPipe to convert thousands of ASL videos into standardized `.npy` coordinate tensors. Each frame captures 1,662 points, but we "slice" this down to the upper body and hands for the scoring math.

### Step 2: The DTW Engine
Unlike a traditional Neural Network which "guesses," our engine **measures**. 
*   It uses **Dynamic Time Warping** to find the optimal alignment between two sequences of different speeds.
*   It calculates **Cosine Similarity** on the relative angles of the shoulders, elbows, and finger joints. This makes the scoring "Angle-Agnostic"—it doesn't matter if you are sitting closer or further from the camera than the expert.

### Step 3: Multi-Word Alignment
The engine supports complex phrases. If you sign "Thank You," the engine:
1.  Segments your motion into potential word windows.
2.  Aligns "Thank" and "You" sequentially against the reference bank.
3.  Returns a weighted average score and granular feedback (e.g., "Thank: 85% | You: 40%").

---

## 🛠 GitOps & Deployment Workflows

We use a sophisticated sync strategy to keep the repository lightweight while maintaining a massive data set.

### 📦 Handling "Big Data" (R2 Sync)
Since the landmarks exceed GitHub's 10GB LFS budget, we use a **Local-to-R2** workflow:
1.  **Local Dev:** New signs are added to `ml/data/landmarks/`.
2.  **Manual Sync:** Run `./ml/sync_data.sh` to push local changes to Cloudflare R2.
3.  **Production Boot:** When the Render ML service starts, it runs `download_data.py`, which pulls 1,600 files from R2 in parallel (20 threads) in under 30 seconds.

### 💓 The "Keep-Alive" Heartbeat
To prevent Render's Free Tier from sleeping, a **GitHub Action** (`.github/workflows/keep-alive.yml`) pings the backend and ML endpoints every 12 minutes. This ensures the "Cold Start" delay is minimized for active users.

### 🧪 Local Development (Hybrid Mode)
For the fastest development cycle, we use a hybrid Docker/Local approach:
```bash
# 1. Start the Database and ML Engine in Docker
docker-compose up db ml backend

# 2. Run the Frontend locally (for instant HMR)
cd frontend && npm run dev
```

---

## 📂 Project Structure
```text
├── backend/            # Rust Axum Gateway
│   ├── src/api/        # Endpoints for Inference, Stats, Vocab
│   └── src/auth.rs     # Clerk JWT Verification
├── frontend/           # React + Vite UI
│   └── src/components/ # Camera, Canvas, and Educator UI
├── ml/                 # Python Inference Service
│   ├── data/           # Reference Landmarks & WLASL Metadata
│   ├── dtw_engine.py   # Core mathematical scoring logic
│   └── download_data.py # R2 Parallel Sync Script
├── render.yaml         # Infrastructure as Code (Blueprint)
└── .github/workflows/  # Keep-alive automation
```

---

## 🚀 Scaling & Cost
*   **Infrastructure Cost:** $0.00
*   **Vocabulary:** 494 Signs (Expandable to 2,000+ on R2)
*   **Max Users:** 500 (Clerk Free Tier limit)
*   **Data Egress:** $0.00 (Cloudflare R2 benefit)
