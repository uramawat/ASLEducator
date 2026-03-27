import numpy as np
from fastdtw import fastdtw
from scipy.spatial.distance import cosine

# Feature mapping (1662 elements matched directly to the pipeline_step1_data schema):
# 0-132: Pose (33 points * 4) [x, y, z, vis]
# 132-1536: Face (468 points * 3)
# 1536-1599: Left Hand (21 points * 3) [x, y, z]
# 1599-1662: Right Hand (21 points * 3) [x, y, z]

def compute_similarity(user_sequence: list, reference_sequence: list) -> float:
    user_arr = np.array(user_sequence)
    ref_arr = np.array(reference_sequence)
    
    if len(user_arr) < 2 or len(ref_arr) < 2:
        return 0.0

    user_reduced = np.concatenate((user_arr[:, 0:132], user_arr[:, 1536:1662]), axis=1)
    ref_reduced = np.concatenate((ref_arr[:, 0:132], ref_arr[:, 1536:1662]), axis=1)
    
    # We must globally shift the coordinates so the Nose perfectly anchors to (0,0).
    # Otherwise, Cosine Distance evaluates the angle from the top-left corner of the webcam 
    # instead of the relative angle of the limbs extending outward from the user's torso!
    def normalize_spatial(seq):
        out = np.zeros_like(seq)
        for i, frame in enumerate(seq):
            nose_x, nose_y = frame[0], frame[1]
            if nose_x == 0 and nose_y == 0:
                # Add epsilon to prevent 0-division in Scipy Cosine
                out[i] = frame + 1e-10 
                continue
                
            # Shift Pose Points 
            for j in range(0, 132, 4):
               # Only shift if tracking successfully located the node
               if frame[j] != 0 or frame[j+1] != 0:
                   out[i, j] = frame[j] - nose_x
                   out[i, j+1] = frame[j+1] - nose_y
                   out[i, j+2] = frame[j+2]
                   out[i, j+3] = frame[j+3]
            
            # Shift Hand Points 
            for j in range(132, 132+126, 3):
               if frame[j] != 0 or frame[j+1] != 0:
                   out[i, j] = frame[j] - nose_x
                   out[i, j+1] = frame[j+1] - nose_y
                   out[i, j+2] = frame[j+2]
                   
            # Failsafe against absolute zero arrays which break scipy
            if np.all(out[i] == 0):
                out[i] += 1e-10
                
        return out
        
    user_norm = normalize_spatial(user_reduced)
    ref_norm = normalize_spatial(ref_reduced)

    # MAGIC FIX: The Torso/Legs/Face take up 132 variables compared to the Hands' 126.
    # Since the user sits still in a chair, the static body geometry dominates the math,
    # causing Cosine Angles to remain identically aligned regardless of what the hands do.
    # We slice out the stationary body geometry entirely—leaving only Shoulders, Elbows, Wrists, and Hands.
    active_user = np.concatenate((user_norm[:, 44:68], user_norm[:, 132:258]), axis=1)
    active_ref = np.concatenate((ref_norm[:, 44:68], ref_norm[:, 132:258]), axis=1)

    try:
        # Cosine distance measures solely the active appendage shapes
        distance, path = fastdtw(active_user, active_ref, dist=cosine)
        
        avg_cosine_gap = distance / len(path)
        print(f"DEBUG DTW: Distance {distance:.2f}, Path {len(path)}, Avg Gap: {avg_cosine_gap:.6f}")
        
        # EXPERT vs EXPERT gap for the SAME word: ~0.19
        # EXPERT vs EXPERT gap for DIFFERENT word: ~0.44
        # We apply an aggressive offset multiplier to completely separate organic variance from failure.
        offset = max(0.0, avg_cosine_gap - 0.10)
        raw_score = 100.0 - (offset * 300.0)
        score = max(0.0, min(100.0, raw_score))
        
        # UI Polish
        if score > 20:
            score += 20
            
        return min(100.0, score)
    except Exception as e:
        print(f"Cosine DTW Error: {e}")
        return 0.0 

    return min(100.0, score)
