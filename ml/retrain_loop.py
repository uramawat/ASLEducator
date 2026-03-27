import psycopg2
import os
import shutil
import numpy as np
import cv2
import mediapipe as mp
from dotenv import load_dotenv

# Re-use training functions
from pipeline_step2_train import load_data, build_and_train

load_dotenv(dotenv_path="../backend/.env")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARK_DIR = os.path.join(BASE_DIR, "data", "landmarks")
VIDEO_DIR = os.path.join(BASE_DIR, "..", "backend", "storage", "videos")

def fetch_verified_attempts():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in backend/.env")
        return []

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # We want anything that the user explicitly corrected or selected.
        cur.execute("""
            SELECT id, selected_candidate, user_correction 
            FROM sign_attempts 
            WHERE selected_candidate IS NOT NULL OR user_correction IS NOT NULL
        """)
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        return results
    except Exception as e:
        print(f"DB Error: {e}")
        return []

def extract_landmark_for_video(video_id, target_gloss):
    video_path = os.path.join(VIDEO_DIR, f"{video_id}.webm")
    if not os.path.exists(video_path):
        print(f"Video {video_path} not found on disk.")
        return
        
    out_dir = os.path.join(LANDMARK_DIR, target_gloss.upper())
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{video_id}_feedback.npy")
    
    if os.path.exists(out_file):
        return # Already processed
        
    mp_holistic = mp.solutions.holistic
    cap = cv2.VideoCapture(video_path)
    frames_landmarks = []
    
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            results = holistic.process(image)
            
            pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(132)
            face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(1404)
            lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(63)
            rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(63)
            
            concat = np.concatenate([pose, face, lh, rh])
            frames_landmarks.append(concat)
            
    cap.release()
    
    if len(frames_landmarks) > 0:
        np.save(out_file, np.array(frames_landmarks))
        print(f"Extracted feedback data for {target_gloss}")

if __name__ == "__main__":
    print("Fetching human-verified data from database...")
    verified_data = fetch_verified_attempts()
    print(f"Found {len(verified_data)} verified attempts.")
    
    new_data_added = False
    
    for row in verified_data:
        v_id, selected, correction = row
        # Correction takes precedence over selected
        target_gloss = correction if correction else selected
        if target_gloss:
            target_gloss = target_gloss.upper().strip()
            
            out_file = os.path.join(LANDMARK_DIR, target_gloss, f"{v_id}_feedback.npy")
            if not os.path.exists(out_file):
                extract_landmark_for_video(v_id, target_gloss)
                new_data_added = True
                
    if new_data_added:
        print("New feedback data was added. Retraining the model...")
        X, y, glosses = load_data()
        if X is not None:
            build_and_train(X, y, len(glosses))
    else:
        print("No new feedback data to process. Model is up to date.")
