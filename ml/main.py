from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import os
import glob
import json
from dtw_engine import compute_similarity

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARKS_DIR = os.path.join(BASE_DIR, "data", "landmarks")
JSON_PATH = os.path.join(BASE_DIR, "data", "WLASL_v0.3.json")

# Pre-load YouTube URLs for the vocabulary with timestamps
YOUTUBE_MAPPING = {}
try:
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, "r") as f:
            wlasl_data = json.load(f)
            for entry in wlasl_data:
                gloss = entry['gloss'].lower()
                yt_url = None
                for inst in entry['instances']:
                    url = inst['url']
                    if 'youtube' in url or 'youtu.be' in url:
                        frame_start = inst.get('frame_start', 1)
                        fps = inst.get('fps', 25)
                        start_sec = max(0, int((frame_start - 1) / fps))
                        separator = '&' if '?' in url else '?'
                        yt_url = f"{url}{separator}t={start_sec}"
                        break
                if yt_url:
                    YOUTUBE_MAPPING[gloss] = yt_url
except Exception as e:
    print(f"Error loading WLASL JSON: {e}")

class ScoreSignRequest(BaseModel):
    target_phrase: str
    landmarks: list[list[float]]

@app.post("/predict")
async def predict_sign_score(req: ScoreSignRequest):
    try:
        if not req.landmarks or len(req.landmarks) < 5:
            return JSONResponse({"error": "Insufficient motion captured."}, status_code=400)
            
        target = req.target_phrase.lower().strip()
        user_landmarks = np.array(req.landmarks)
        
        # 1. Attempt Whole-Phrase Match FIRST (for glosses like 'thank you')
        word_dir = os.path.join(LANDMARKS_DIR, target)
        if os.path.exists(word_dir):
            reference_files = glob.glob(os.path.join(word_dir, "*.npy"))
            if reference_files:
                best_score = 0.0
                for ref_file in reference_files:
                    ref_sequence = np.load(ref_file).tolist()
                    trimmed_ref = [f for f in ref_sequence if f[0] != 0.0 or f[3] != 0.0]
                    if len(trimmed_ref) < 5: continue
                    score = compute_similarity(req.landmarks, trimmed_ref)
                    if not np.isnan(score):
                        best_score = max(best_score, score)
                
                return {
                    "similarity_score": best_score,
                    "feedback": "Perfect match found!" if best_score > 80 else "Good attempt on that sign!"
                }

        # 2. Fallback to Multi-Word Sequential Alignment
        words = target.split()
        if not words:
            return JSONResponse({"error": "No target words found in phrase."}, status_code=400)
        
        total_score = 0.0
        current_frame = 0
        word_feedbacks = []
        
        for word in words:
            word_dir = os.path.join(LANDMARKS_DIR, word)
            if not os.path.exists(word_dir):
                return JSONResponse({"error": f"No reference bank found for '{word}' or the entire phrase '{target}'"}, status_code=404)
                
            reference_files = glob.glob(os.path.join(word_dir, "*.npy"))
            if not reference_files:
                return JSONResponse({"error": f"0 expert references available for '{word}'"}, status_code=404)
            
            best_word_score = 0.0
            best_end_frame = current_frame + 20 # Minimum window
            
            for ref_file in reference_files:
                ref_sequence = np.load(ref_file).tolist()
                trimmed_ref = [f for f in ref_sequence if f[0] != 0.0 or f[3] != 0.0]
                if len(trimmed_ref) < 5: continue
                
                remaining_user = user_landmarks[current_frame:]
                if len(remaining_user) < 5: break
                
                is_last = (word == words[-1])
                search_len = len(remaining_user) if is_last else min(len(remaining_user), int(len(trimmed_ref) * 1.5))
                
                sub_user = remaining_user[:search_len].tolist()
                score = compute_similarity(sub_user, trimmed_ref)
                
                if not np.isnan(score) and score > best_word_score:
                    best_word_score = score
                    best_end_frame = current_frame + search_len
            
            total_score += best_word_score
            current_frame = best_end_frame
            word_feedbacks.append(f"{word}: {int(best_word_score)}%")

        final_score = total_score / len(words)
        if np.isnan(final_score): final_score = 0.0
        
        # UX Thresholding Map
        feedback = f"Phrase match: {' | '.join(word_feedbacks)}. "
        if final_score > 80:
            feedback += "Flawless execution!"
        elif final_score > 50:
            feedback += "Good job, but watch your transitions."
        else:
            feedback += "Try to sign each word more distinctly."
            
        return {
            "similarity_score": final_score,
            "feedback": feedback
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/health")
def health():
    exists = os.path.exists(LANDMARKS_DIR)
    words = sorted([d for d in os.listdir(LANDMARKS_DIR) if os.path.isdir(os.path.join(LANDMARKS_DIR, d))]) if exists else []
    active_mapping = {w: YOUTUBE_MAPPING[w] for w in words if w in YOUTUBE_MAPPING}
    return {
        "status": "ok", 
        "dtw_engine": "operational", 
        "expert_vocabulary_banks_loaded": len(words), 
        "available_words": words,
        "youtube_mapping": active_mapping
    }
