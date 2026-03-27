FROM rust:slim-bookworm as builder

WORKDIR /app

# Install dependencies for openssl/reqwest
RUN apt-get update && apt-get install -y pkg-config libssl-dev

COPY . .

# Build for release
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim

# Install SSL certs for HTTP requests out to Gemini (if needed) and python service
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/target/release/backend .

# Ensure storage directory exists for user videos
RUN mkdir -p storage/videos

EXPOSE 3000

CMD ["./backend"]
