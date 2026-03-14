# Multi-stage build: compiles the Go binary then packages it in a minimal image.

FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o movies-api .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/movies-api .
EXPOSE 8080
CMD ["./movies-api"]
