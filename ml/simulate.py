import numpy as np
import requests
import json
import glob

files = glob.glob('data/landmarks/book/*.npy')
if not files:
    print("No references found.")
    exit(1)

# Take the first reference video and trim the trailing zeros exactly like the user pipeline
ref = np.load(files[0])
trimmed = [f for f in ref if not (f[0] == 0.0 and f[3] == 0.0)]

# We will literally submit the EXACT SAME TENSOR. It should score 100%.
arr = np.array(trimmed)

payload = {
    "target_word": "book",
    "landmarks": arr.tolist()
}

print(f"Simulating User Payload: {len(trimmed)} frames.")

# Execute request against live docker container!
try:
    res = requests.post("http://localhost:8000/predict", json=payload)
    print("Response Status:", res.status_code)
    print("Response JSON:", res.json())
except Exception as e:
    print("Failed strictly connecting to container:", e)

# Now Let's submit a tensor with purely 5% random jitter to mimic a slightly inaccurate human!
jittered_arr = arr + np.random.normal(0, 0.05, arr.shape)
payload_jittered = {
    "target_word": "book",
    "landmarks": jittered_arr.tolist()
}

print(f"\nSimulating Noisy Payload (5% variance)...")
try:
    res = requests.post("http://localhost:8000/predict", json=payload_jittered)
    print("Response Status:", res.status_code)
    print("Response JSON:", res.json())
except Exception as e:
    print("Failed strictly connecting to container:", e)
