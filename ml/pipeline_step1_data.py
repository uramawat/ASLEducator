import os
import json
import argparse
import urllib.request
import subprocess
from collections import defaultdict
import glob
from tqdm import tqdm
import numpy as np
import cv2
import mediapipe as mp

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
VIDEO_DIR = os.path.join(DATA_DIR, "videos")
LANDMARK_DIR = os.path.join(DATA_DIR, "landmarks")
JSON_PATH = os.path.join(DATA_DIR, "WLASL_v0.3.json")

os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(LANDMARK_DIR, exist_ok=True)

WLASL_URL = "https://raw.githubusercontent.com/dxli94/WLASL/master/start_kit/WLASL_v0.3.json"

def download_wlasl_json():
    """Downloads the official WLASL JSON index."""
    if not os.path.exists(JSON_PATH):
        print("Downloading WLASL index JSON...")
        urllib.request.urlretrieve(WLASL_URL, JSON_PATH)
    else:
        print("WLASL index already exists.")

def get_top_classes(vocab_size):
    """Parses JSON and returns the most frequent glosses/classes."""
    with open(JSON_PATH, "r") as f:
        data = json.load(f)
        
    counts = {}
    for entry in data:
        gloss = entry['gloss']
        counts[gloss] = len(entry['instances'])
        
    # Sort by frequency descending
    sorted_classes = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    top_n = [c[0] for c in sorted_classes[:vocab_size]]
    
    # Return dictionary of gloss -> entry
    filtered_data = {entry['gloss']: entry for entry in data if entry['gloss'] in top_n}
    return filtered_data, top_n

def download_videos(vocab_data):
    """Uses yt-dlp to download youtube videos for the selected vocabulary."""
    print("Downloading videos for Top N vocabulary... (This may take a long time and some videos may fail to download due to YouTube takedowns)")
    
    for gloss, entry in tqdm(vocab_data.items(), desc="Downloading Glosses"):
        gloss_dir = os.path.join(VIDEO_DIR, gloss)
        os.makedirs(gloss_dir, exist_ok=True)
        
        for instance in entry['instances']:
            video_id = instance['video_id']
            url = instance['url']
            out_file = os.path.join(gloss_dir, f"{video_id}.mp4")
            
            if os.path.exists(out_file) or os.path.exists(out_file.replace('.mp4', '.webm')):
                continue
                
            if 'youtube' in url or 'youtu.be' in url:
                try:
                    # Limit to small/medium quality to save space
                    cmd = [
                        'uv', 'run', 'yt-dlp', '-f', 'worstvideo[ext=mp4]/mp4',
                        '-o', out_file,
                        '--no-playlist', '--quiet', '--no-warnings',
                        url
                    ]
                    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
                except subprocess.TimeoutExpired:
                    pass
                except Exception:
                    pass

MAX_FRAMES = 60

def extract_landmarks(vocab_data):
    """Runs MediaPipe on downloaded videos and saves features to .npy."""
    print("Extracting MediaPipe landmarks from downloaded videos...")
    
    mp_holistic = mp.solutions.holistic
    
    # Flatten instance metadata for quick lookup
    video_metadata = {}
    for entry in vocab_data.values():
        for inst in entry['instances']:
            video_metadata[str(inst['video_id'])] = inst

    # Count how many successfully downloaded
    videos = glob.glob(f"{VIDEO_DIR}/*/*.mp4") + glob.glob(f"{VIDEO_DIR}/*/*.webm")
    print(f"Found {len(videos)} videos downloaded. Starting extraction.")

    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        for video_path in tqdm(videos, desc="Extracting Landmarks"):
            # e.g., video_path: .../data/videos/BOOK/12345.mp4
            parts = video_path.split(os.sep)
            video_id, _ = os.path.splitext(parts[-1])
            gloss = parts[-2]
            
            out_dir = os.path.join(LANDMARK_DIR, gloss)
            os.makedirs(out_dir, exist_ok=True)
            out_file = os.path.join(out_dir, f"{video_id}.npy")
            
            if os.path.exists(out_file):
                continue
                
            cap = cv2.VideoCapture(video_path)
            
            # Apply WLASL crop start frame
            start_frame = 1
            if video_id in video_metadata:
                start_frame = max(1, video_metadata[video_id].get('frame_start', 1))
                
            if start_frame > 1:
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame - 1)

            frames_landmarks = []
            
            while cap.isOpened():
                if len(frames_landmarks) >= MAX_FRAMES:
                    break
                    
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Convert BGR to RGB for MediaPipe
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image.flags.writeable = False
                results = holistic.process(image)
                
                # Extract coordinates
                # Pose: 33 points (x, y, z, visibility) = 132
                pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(132)
                # Face: 468 points (x, y, z) = 1404
                face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(1404)
                # Left Hand: 21 points (x, y, z) = 63
                lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(63)
                # Right Hand: 21 points (x, y, z) = 63
                rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(63)
                
                # Total features per frame: 132 + 1404 + 63 + 63 = 1662
                concat = np.concatenate([pose, face, lh, rh])
                frames_landmarks.append(concat)
                
            cap.release()
            
            if len(frames_landmarks) > 0:
                np.save(out_file, np.array(frames_landmarks))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WLASL Data Pipeline")
    parser.add_argument("--vocab_size", type=int, default=5, help="Number of Top ASL words to process")
    parser.add_argument("--skip_download", action="store_true", help="Skip downloading videos if already done")
    args = parser.parse_args()

    download_wlasl_json()
    vocab_data, top_classes = get_top_classes(args.vocab_size)
    print(f"Target Vocabulary ({args.vocab_size} words): {top_classes}")
    
    if not args.skip_download:
        download_videos(vocab_data)
        
    extract_landmarks(vocab_data)
    print("Pipeline Step 1 (Data & Extraction) Complete!")
