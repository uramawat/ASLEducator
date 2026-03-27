import numpy as np
import glob
from scipy.spatial.distance import cosine

files = glob.glob('data/landmarks/book/*.npy')
ref = np.load(files[0])
trimmed = [f for f in ref if not (f[0] == 0.0 and f[3] == 0.0)]
arr = np.array(trimmed)

# Take frame 0
u = np.concatenate((arr[0, 0:132], arr[0, 1536:1662]))
v = u + np.random.normal(0, 0.05, u.shape)

# Clean vectors 
u[u==0] = 1e-10
v[v==0] = 1e-10

dist = cosine(u, v)

print(f"Cosine distance between Frame0 and 5% Noisy Frame0: {dist:.6f}")
