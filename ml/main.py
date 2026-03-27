from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import os
import glob
from dtw_engine import compute_similarity

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# We completely recycle the beautifully scraped reference data we extracted in Step 1!
LANDMARKS_DIR = os.path.join(BASE_DIR, "data", "landmarks")

class ScoreSignRequest(BaseModel):
    target_word: str
    landmarks: list[list[float]]

@app.post("/predict")
async def predict_sign_score(req: ScoreSignRequest):
    try:
        if not req.landmarks or len(req.landmarks) < 5:
            return JSONResponse({"error": "Insufficient motion captured."}, status_code=400)
            
        word_dir = os.path.join(LANDMARKS_DIR, req.target_word.lower())
        if not os.path.exists(word_dir):
            return JSONResponse({"error": f"No WLASL reference tensors found for '{req.target_word}'"}, status_code=404)
            
        # Extract ALL available expert reference videos mapped in the WLASL tensor output directory
        reference_files = glob.glob(os.path.join(word_dir, "*.npy"))
        if not reference_files:
            return JSONResponse({"error": "System has 0 compiled expert references available for this sign"}, status_code=404)
            
        best_score = 0.0
        
        # Evaluate user motion against *every* recorded WLASL signer for this word, taking the best match
        # This inherently solves ASL dialect/variation because the user gets matched against whichever format they organically followed!
        for ref_file in reference_files:
            ref_sequence = np.load(ref_file).tolist()
            
            # Trim the zero-padding from our original pipeline implementation ensuring DTW doesn't measure trailing silences
            trimmed_ref = []
            for frame in ref_sequence:
                if frame[0] == 0.0 and frame[3] == 0.0:
                    continue
                trimmed_ref.append(frame)
                
            if len(trimmed_ref) < 5: continue
            
            score = compute_similarity(req.landmarks, trimmed_ref)
            if score > best_score:
                best_score = score
                
        # UX Thresholding Map
        feedback = "Perfect form! That was technically flawless."
        if best_score < 80:
            feedback = "Great attempt! Keep an eye closely on your hand trajectories compared to the video."
        if best_score < 50:
            feedback = "Keep grinding. Try to precisely trace the starting spatial anchor and the stop anchor."
            
        return {
            "similarity_score": best_score,
            "feedback": feedback
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/health")
def health():
    words = os.listdir(LANDMARKS_DIR) if os.path.exists(LANDMARKS_DIR) else []
    return {"status": "ok", "dtw_engine": "operational", "expert_vocabulary_banks_loaded": len(words)}
