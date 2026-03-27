import os
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
import argparse
from tqdm import tqdm

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARK_DIR = os.path.join(BASE_DIR, "data", "landmarks")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MAX_FRAMES = 60  # Most ASL clips are under 60 frames
FEATURE_DIM = 1662 # 132(pose) + 1404(face) + 63(lh) + 63(rh)

def load_data():
    if not os.path.exists(LANDMARK_DIR):
        print("Landmark directory not found. Please run pipeline_step1_data.py first.")
        return None, None, None

    glosses = [d for d in os.listdir(LANDMARK_DIR) if os.path.isdir(os.path.join(LANDMARK_DIR, d))]
    glosses.sort() # Ensure consistent mapping
    
    label_map = {label: num for num, label in enumerate(glosses)}
    
    sequences, labels = [], []
    
    for gloss in glosses:
        gloss_dir = os.path.join(LANDMARK_DIR, gloss)
        for npy_file in tqdm(os.listdir(gloss_dir), desc=f"Loading {gloss}"):
            if not npy_file.endswith(".npy"):
                continue
            res = np.load(os.path.join(gloss_dir, npy_file))
            
            # Padding / Truncating
            if len(res) > MAX_FRAMES:
                res = res[:MAX_FRAMES]
            elif len(res) < MAX_FRAMES:
                padding = np.zeros((MAX_FRAMES - len(res), FEATURE_DIM))
                res = np.concatenate([res, padding])
                
            sequences.append(res)
            labels.append(label_map[gloss])
            
    if not sequences:
        print("No training data found.")
        return None, None, None
        
    X = np.array(sequences)
    y = to_categorical(labels, num_classes=len(glosses))
    
    # Save label map for inference
    with open(os.path.join(MODEL_DIR, "label_map.txt"), "w") as f:
        for lbl, idx in label_map.items():
            f.write(f"{idx}:{lbl}\n")
            
    return X, y, glosses

def build_and_train(X, y, num_classes):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    
    model = Sequential([
        LSTM(64, return_sequences=True, activation='relu', input_shape=(MAX_FRAMES, FEATURE_DIM)),
        LSTM(128, return_sequences=True, activation='relu'),
        LSTM(64, return_sequences=False, activation='relu'),
        Dense(64, activation='relu'),
        Dropout(0.2), # Prevent overfitting
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    
    checkpoint = ModelCheckpoint(os.path.join(MODEL_DIR, 'asl_model.keras'), monitor='val_categorical_accuracy', save_best_only=True, mode='max')
    early_stop = EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True)
    
    print(f"Training Model on {len(X_train)} samples, validating on {len(X_test)} samples...")
    model.fit(X_train, y_train, epochs=200, validation_data=(X_test, y_test), callbacks=[checkpoint, early_stop])
    print("Training complete. Best model saved to models/asl_model.keras")

if __name__ == "__main__":
    X, y, glosses = load_data()
    if X is not None:
        print(f"Loaded data shape: {X.shape}, labels shape: {y.shape}")
        build_and_train(X, y, len(glosses))
