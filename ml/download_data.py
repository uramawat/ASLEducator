import os
import boto3
from botocore.config import Config
from concurrent.futures import ThreadPoolExecutor

# R2 Configuration
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "asl-landmarks")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARKS_DIR = os.path.join(BASE_DIR, "data", "landmarks")

def download_file(s3, key):
    local_path = os.path.join(LANDMARKS_DIR, key)
    local_dir = os.path.dirname(local_path)
    if not os.path.exists(local_dir):
        os.makedirs(local_dir, exist_ok=True)
    
    if not os.path.exists(local_path):
        s3.download_file(R2_BUCKET_NAME, key, local_path)
        return True
    return False

def download_from_r2():
    if not R2_ENDPOINT_URL or not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY:
        print("R2 environment variables not set. Skipping download.")
        return

    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

    print(f"🚀 Starting Parallel Sync from R2...")
    
    # Get list of all files
    all_keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for result in paginator.paginate(Bucket=R2_BUCKET_NAME):
        if "Contents" in result:
            all_keys.extend([obj["Key"] for obj in result["Contents"] if obj["Key"].endswith(".npy")])

    print(f"📦 Found {len(all_keys)} files. Downloading...")

    # Download in parallel (20 threads)
    with ThreadPoolExecutor(max_workers=20) as executor:
        results = list(executor.map(lambda key: download_file(s3, key), all_keys))
    
    downloaded = sum(1 for r in results if r)
    print(f"✅ Sync complete! Downloaded {downloaded} new files.")

if __name__ == "__main__":
    download_from_r2()
