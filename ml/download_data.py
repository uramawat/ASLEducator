import os
import boto3
from botocore.config import Config

# R2 Configuration (These will be environment variables in Render)
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "asl-landmarks")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANDMARKS_DIR = os.path.join(BASE_DIR, "data", "landmarks")

def download_from_r2():
    if not R2_ENDPOINT_URL or not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY:
        print("R2 environment variables not set. Skipping download.")
        return

    print(f"Connecting to R2 endpoint: {R2_ENDPOINT_URL}")
    
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

    if not os.path.exists(LANDMARKS_DIR):
        os.makedirs(LANDMARKS_DIR)

    print(f"Syncing landmarks from bucket: {R2_BUCKET_NAME}...")
    
    # List and download files
    paginator = s3.get_paginator("list_objects_v2")
    for result in paginator.paginate(Bucket=R2_BUCKET_NAME):
        if "Contents" not in result:
            break
            
        for obj in result["Contents"]:
            key = obj["Key"]
            if not key.endswith(".npy"):
                continue
                
            local_path = os.path.join(LANDMARKS_DIR, key)
            local_dir = os.path.dirname(local_path)
            
            if not os.path.exists(local_dir):
                os.makedirs(local_dir)
                
            # Download if not exists locally (primitive sync)
            if not os.path.exists(local_path):
                print(f"Downloading {key}...")
                s3.download_file(R2_BUCKET_NAME, key, local_path)

    print("✅ Landmarks sync complete!")

if __name__ == "__main__":
    download_from_r2()
