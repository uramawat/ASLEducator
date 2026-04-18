#!/bin/bash

# Configuration (Uses the 'r2' profile we set up in AWS CLI)
BUCKET_NAME="asl-landmarks"
ENDPOINT_URL="https://ee0fdcdf275de9277d131051fed22fb0.r2.cloudflarestorage.com"
LOCAL_DIR="ml/data/landmarks/"

echo "🔄 Starting sync to Cloudflare R2..."

# --size-only is faster for .npy files as they rarely change size without content changing
aws s3 sync "$LOCAL_DIR" "s3://$BUCKET_NAME/" \
    --endpoint-url "$ENDPOINT_URL" \
    --profile r2 \
    --size-only

echo "✅ Sync complete!"
