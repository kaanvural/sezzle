FROM node:24-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.27-alpine AS backend
WORKDIR /app
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server .

FROM alpine:3.22
RUN adduser -D -H app
COPY --from=backend /server /usr/local/bin/server
COPY --from=frontend /app/dist /static
ENV STATIC_DIR=/static
EXPOSE 8080
USER app
CMD ["server"]
