# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o hello-otel-social .

# Runtime stage
FROM alpine:latest

WORKDIR /app
RUN addgroup -g 1001 -S goapp && adduser -S app -u 1001
COPY --from=builder --chown=app:goapp /app/hello-otel-social .

USER app
EXPOSE 8080

CMD ["./hello-otel-social"]
