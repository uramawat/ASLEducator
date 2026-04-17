import os
import shutil

# Top 100 most common ASL signs (estimated based on WLASL top labels)
KEEP_WORDS = {
    "about", "all", "apple", "bad", "bath", "bed", "before", "bird", "black", "blue", 
    "book", "boy", "bread", "brother", "brown", "but", "bye", "can", "car", "cat", 
    "change", "color", "come", "computer", "cook", "corn", "cousin", "cow", "dance", 
    "dark", "day", "deaf", "drink", "dry", "eat", "egg", "elephant", "enjoy", "family", 
    "father", "feel", "fine", "finish", "fish", "flower", "food", "forget", "friend", 
    "full", "girl", "give", "go", "good", "green", "happy", "have", "hear", "hello", 
    "help", "home", "hot", "house", "how", "hungry", "know", "language", "learn", 
    "like", "little", "love", "make", "man", "me", "meat", "milk", "more", "mother", 
    "movie", "my", "name", "new", "nice", "night", "no", "not", "now", "orange", 
    "pancake", "paper", "party", "past", "pay", "pen", "pencil", "people", "pig", 
    "pizza", "play", "please", "police", "purple", "quiet", "rabbit", "rain", "read", 
    "red", "remember", "ride", "run", "sad", "same", "say", "school", "see", "share", 
    "shirt", "shoes", "short", "sick", "sign", "sit", "sleep", "slow", "small", 
    "smile", "snow", "soft", "some", "sorry", "star", "stop", "student", "study", 
    "sun", "table", "take", "talk", "tall", "tea", "teach", "teacher", "telephone", 
    "tell", "test", "thank you", "think", "thirsty", "tiger", "time", "tired", 
    "today", "tomorrow", "tree", "truck", "ugly", "uncle", "understand", "up", "use", 
    "visit", "wait", "walk", "want", "wash", "water", "way", "we", "wear", "weather", 
    "week", "wet", "what", "when", "where", "which", "white", "who", "why", "wife", 
    "will", "win", "window", "with", "woman", "work", "write", "wrong", "year", 
    "yellow", "yes", "yesterday", "you", "your"
}

LANDMARKS_DIR = "ml/data/landmarks"

def prune():
    if not os.path.exists(LANDMARKS_DIR):
        print("Landmarks directory not found.")
        return

    all_dirs = [d for d in os.listdir(LANDMARKS_DIR) if os.path.isdir(os.path.join(LANDMARKS_DIR, d))]
    removed = 0
    kept = 0

    for d in all_dirs:
        if d.lower() not in KEEP_WORDS:
            shutil.rmtree(os.path.join(LANDMARKS_DIR, d))
            removed += 1
        else:
            kept += 1

    print(f"Pruning complete! Kept {kept} words, removed {removed} words.")

if __name__ == "__main__":
    prune()
