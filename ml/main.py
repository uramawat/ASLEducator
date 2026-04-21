from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import os
import glob
import json
import boto3
from botocore.config import Config
from dtw_engine import compute_similarity

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARKS_DIR = os.path.join(BASE_DIR, "data", "landmarks")
JSON_PATH = os.path.join(BASE_DIR, "data", "WLASL_v0.3.json")

# R2 Configuration
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "asl-landmarks")

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT_URL,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto"
)

# Pre-load YouTube URLs
YOUTUBE_MAPPING = {}
try:
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, "r") as f:
            wlasl_data = json.load(f)
            for entry in wlasl_data:
                gloss = entry['gloss'].lower()
                for inst in entry['instances']:
                    url = inst['url']
                    if 'youtube' in url or 'youtu.be' in url:
                        frame_start = inst.get('frame_start', 1)
                        fps = inst.get('fps', 25)
                        start_sec = max(0, int((frame_start - 1) / fps))
                        separator = '&' if '?' in url else '?'
                        YOUTUBE_MAPPING[gloss] = f"{url}{separator}t={start_sec}"
                        break
except Exception as e:
    print(f"Error loading metadata: {e}")

class ScoreSignRequest(BaseModel):
    target_phrase: str
    landmarks: list[list[float]]

def ensure_word_data(word: str):
    """Lazy-download landmarks for a specific word from R2 if missing."""
    word_dir = os.path.join(LANDMARKS_DIR, word)
    if not os.path.exists(word_dir):
        os.makedirs(word_dir, exist_ok=True)
    
    # Check if we already have files
    if len(glob.glob(os.path.join(word_dir, "*.npy"))) > 0:
        return True

    try:
        print(f"📥 Lazy-downloading landmarks for '{word}' from R2...")
        # List files in the word's "folder" in R2
        prefix = f"{word}/"
        response = s3.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix)
        
        if 'Contents' not in response:
            return False

        for obj in response['Contents']:
            key = obj['Key']
            local_path = os.path.join(LANDMARKS_DIR, key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            s3.download_file(R2_BUCKET_NAME, key, local_path)
        
        return True
    except Exception as e:
        print(f"Failed to lazy-download '{word}': {e}")
        return False

@app.post("/predict")
async def predict_sign_score(req: ScoreSignRequest):
    try:
        if not req.landmarks or len(req.landmarks) < 5:
            return JSONResponse({"error": "Insufficient motion captured."}, status_code=400)
            
        target = req.target_phrase.lower().strip()
        words = target.split()
        
        total_score = 0.0
        current_frame = 0
        word_feedbacks = []
        
        for word in words:
            # 💡 THE MAGIC: Download only what we need!
            if not ensure_word_data(word):
                return JSONResponse({"error": f"Sign reference for '{word}' not found in R2."}, status_code=404)
                
            word_dir = os.path.join(LANDMARKS_DIR, word)
            reference_files = glob.glob(os.path.join(word_dir, "*.npy"))
            
            best_word_score = 0.0
            best_end_frame = current_frame + 20
            
            user_landmarks = np.array(req.landmarks)
            for ref_file in reference_files:
                ref_sequence = np.load(ref_file).tolist()
                trimmed_ref = [f for f in ref_sequence if f[0] != 0.0 or f[3] != 0.0]
                if len(trimmed_ref) < 5: continue
                
                remaining_user = user_landmarks[current_frame:]
                if len(remaining_user) < 5: break
                
                search_len = len(remaining_user) if word == words[-1] else min(len(remaining_user), int(len(trimmed_ref) * 1.5))
                sub_user = remaining_user[:search_len].tolist()
                score = compute_similarity(sub_user, trimmed_ref)
                
                if not np.isnan(score) and score > best_word_score:
                    best_word_score = score
                    best_end_frame = current_frame + search_len
            
            total_score += best_word_score
            current_frame = best_end_frame
            word_feedbacks.append(f"{word}: {int(best_word_score)}%")

        final_score = total_score / len(words)
        return {"similarity_score": final_score, "feedback": f"Phrase match: {' | '.join(word_feedbacks)}"}
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/health")
def health():
    """Returns vocabulary by querying R2 bucket list instead of local disk."""
    try:
        # Get list of unique 'folders' (words) from R2
        paginator = s3.get_paginator("list_objects_v2")
        words = set()
        for result in paginator.paginate(Bucket=R2_BUCKET_NAME, Delimiter='/'):
            for prefix in result.get('CommonPrefixes', []):
                words.add(prefix.get('Prefix').strip('/'))
        
        sorted_words = sorted(list(words))
        active_mapping = {w: YOUTUBE_MAPPING[w] for w in sorted_words if w in YOUTUBE_MAPPING}
        
        return {
            "status": "ok", 
            "expert_vocabulary_banks_loaded": len(sorted_words), 
            "available_words": sorted_words,
            "youtube_mapping": active_mapping
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
