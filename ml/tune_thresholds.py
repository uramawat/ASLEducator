import os
import numpy as np
import glob
import random
from tqdm import tqdm
from dtw_engine import compute_similarity
from fastdtw import fastdtw
from scipy.spatial.distance import cosine

# Feature mapping and normalization logic mirrored from dtw_engine.py
def normalize_spatial(seq):
    user_arr = np.array(seq)
    user_reduced = np.concatenate((user_arr[:, 0:132], user_arr[:, 1536:1662]), axis=1)
    
    out = np.zeros_like(user_reduced)
    for i, frame in enumerate(user_reduced):
        nose_x, nose_y = frame[0], frame[1]
        if nose_x == 0 and nose_y == 0:
            out[i] = frame + 1e-10 
            continue
            
        for j in range(0, 132, 4):
           if frame[j] != 0 or frame[j+1] != 0:
               out[i, j] = frame[j] - nose_x
               out[i, j+1] = frame[j+1] - nose_y
               out[i, j+2] = frame[j+2]
               out[i, j+3] = frame[j+3]
        
        for j in range(132, 132+126, 3):
           if frame[j] != 0 or frame[j+1] != 0:
               out[i, j] = frame[j] - nose_x
               out[i, j+1] = frame[j+1] - nose_y
               out[i, j+2] = frame[j+2]
               
        if np.all(out[i] == 0):
            out[i] += 1e-10
            
    return out

def get_active_features(norm_seq):
    return np.concatenate((norm_seq[:, 44:68], norm_seq[:, 132:258]), axis=1)

def get_distance(seq1, seq2):
    try:
        # Trim zero-padding (matching main.py logic)
        def trim(seq):
            return [f for f in seq if f[0] != 0.0 or f[3] != 0.0]
        
        seq1_t = trim(seq1)
        seq2_t = trim(seq2)
        
        if len(seq1_t) < 5 or len(seq2_t) < 5:
            return None

        norm1 = normalize_spatial(seq1_t)
        norm2 = normalize_spatial(seq2_t)
        active1 = get_active_features(norm1)
        active2 = get_active_features(norm2)
        distance, path = fastdtw(active1, active2, dist=cosine)
        return distance / len(path)
    except Exception:
        return None

def main():
    base_dir = "data/landmarks"
    words = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    
    pos_distances = []
    neg_distances = []
    
    print(f"Analyzing {len(words)} words...")
    
    # Sample Positive Pairs (Same word, different files)
    print("Sampling Positive Pairs...")
    for word in tqdm(words):
        files = glob.glob(os.path.join(base_dir, word, "*.npy"))
        if len(files) < 2:
            continue
        
        # Take up to 5 pairs per word to balance
        pairs = 0
        random.shuffle(files)
        for i in range(len(files)):
            for j in range(i+1, len(files)):
                d = get_distance(np.load(files[i]), np.load(files[j]))
                if d is not None:
                    pos_distances.append(d)
                    pairs += 1
                if pairs >= 3: break
            if pairs >= 3: break

    # Sample Negative Pairs (Different words)
    print("Sampling Negative Pairs...")
    for _ in tqdm(range(len(pos_distances))):
        w1, w2 = random.sample(words, 2)
        f1 = random.choice(glob.glob(os.path.join(base_dir, w1, "*.npy")))
        f2 = random.choice(glob.glob(os.path.join(base_dir, w2, "*.npy")))
        
        d = get_distance(np.load(f1), np.load(f2))
        if d is not None:
            neg_distances.append(d)

    if not pos_distances or not neg_distances:
        print("Not enough data collected.")
        return

    pos_distances = np.array(pos_distances)
    neg_distances = np.array(neg_distances)

    print(f"\nResults based on {len(pos_distances)} positive and {len(neg_distances)} negative pairs:")
    print(f"Positive: Mean={np.mean(pos_distances):.4f}, Std={np.std(pos_distances):.4f}, Median={np.median(pos_distances):.4f}")
    print(f"Negative: Mean={np.mean(neg_distances):.4f}, Std={np.std(neg_distances):.4f}, Median={np.median(neg_distances):.4f}")

    # Find Equal Error Rate (EER)
    min_dist = min(np.min(pos_distances), np.min(neg_distances))
    max_dist = max(np.max(pos_distances), np.max(neg_distances))
    thresholds = np.linspace(min_dist, max_dist, 100)
    
    best_threshold = 0
    min_diff = 1.0
    
    for t in thresholds:
        false_neg = np.sum(pos_distances > t) / len(pos_distances)
        false_pos = np.sum(neg_distances < t) / len(neg_distances)
        diff = abs(false_neg - false_pos)
        if diff < min_diff:
            min_diff = diff
            best_threshold = t
            eer = (false_neg + false_pos) / 2

    print(f"\nOptimal Threshold (EER): {best_threshold:.4f}")
    print(f"Equal Error Rate: {eer*100:.2f}%")
    
    print("\nProposed Scoring Logic for dtw_engine.py:")
    print(f"threshold = {best_threshold:.4f}")
    print("offset = max(0.0, avg_cosine_gap - (threshold * 0.5))")
    print("score = 100.0 * (1.0 - (offset / threshold))")

if __name__ == "__main__":
    main()
