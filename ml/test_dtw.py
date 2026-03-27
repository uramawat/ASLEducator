import numpy as np
import glob
import sys
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean

def compute_diag(user_arr, ref_arr):
    if len(user_arr) < 2 or len(ref_arr) < 2: return 0.0

    user_reduced = np.concatenate((user_arr[:, 0:132], user_arr[:, 1536:1662]), axis=1)
    ref_reduced = np.concatenate((ref_arr[:, 0:132], ref_arr[:, 1536:1662]), axis=1)
    
    def normalize_spatial(seq):
        out = np.zeros_like(seq)
        for i, frame in enumerate(seq):
            nose_x, nose_y = frame[0], frame[1]
            if nose_x == 0 and nose_y == 0: continue
            for j in range(0, 132, 4):
               out[i, j] = frame[j] - nose_x
               out[i, j+1] = frame[j+1] - nose_y
               out[i, j+2] = frame[j+2]
               out[i, j+3] = frame[j+3]
            for j in range(132, 132+126, 3):
               if frame[j] != 0 or frame[j+1] != 0:
                   out[i, j] = frame[j] - nose_x
                   out[i, j+1] = frame[j+1] - nose_y
                   out[i, j+2] = frame[j+2]
        return out
        
    user_norm = normalize_spatial(user_reduced)
    ref_norm = normalize_spatial(ref_reduced)

    distance, path = fastdtw(user_norm, ref_norm, dist=euclidean)
    avg_gap_per_frame = distance / len(path)
    
    print(f"Total Distance: {distance:.2f}")
    print(f"Path Length: {len(path)}")
    print(f"Avg Gap Per Frame: {avg_gap_per_frame:.4f}")
    print(f"Currently hardcoded raw score: {100.0 - (avg_gap_per_frame * 90.0):.2f}")

files = glob.glob('data/landmarks/book/*.npy')
if len(files) < 2:
    print("Not enough files.")
    sys.exit(1)

f1 = np.load(files[0])
f2 = np.load(files[1])

# Trim identical to main.py
def trim(seq):
    return [f for f in seq if f[0] != 0.0 or f[3] != 0.0]

f1_t = np.array(trim(f1))
f2_t = np.array(trim(f2))

print("Self vs Self:")
compute_diag(f1_t, f1_t)

print("\nSigner 1 vs Signer 2:")
compute_diag(f1_t, f2_t)
