package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hello-otel-social/lib"
)

var store *lib.Store

func init() {
	store = lib.NewStore()
}

// Response helpers
func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Health endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"status": "ok"}, 200)
}

// Users endpoints
func usersListHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()
	users := store.GetUsers()
	lib.UsersList.Add(ctx, 1)
	lib.Logger.Info(ctx, "users.list", map[string]interface{}{"count": len(users)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, map[string]interface{}{"users": users, "count": len(users)}, 200)
}

func userCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	start := time.Now()
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	user := store.CreateUser(req.Username, req.Email)
	lib.UserCreated.Add(ctx, 1)
	lib.Logger.Info(ctx, "user.created", map[string]interface{}{"user_id": user["id"], "username": req.Username})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, user, 201)
}

// Posts endpoints
func postsListHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()
	posts := store.GetPosts()
	lib.PostsList.Add(ctx, 1)
	lib.Logger.Info(ctx, "posts.list", map[string]interface{}{"count": len(posts)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, map[string]interface{}{"posts": posts, "count": len(posts)}, 200)
}

func postCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	start := time.Now()
	var req struct {
		UserID  string `json:"user_id"`
		Content string `json:"content"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	post := store.CreatePost(req.UserID, req.Content)
	lib.PostCreated.Add(ctx, 1)
	lib.Logger.Info(ctx, "post.created", map[string]interface{}{"post_id": post["id"], "user_id": req.UserID})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, post, 201)
}

// Feed endpoint
func feedHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()
	posts := store.GetPosts()
	// Shuffle posts to simulate feed order
	rand.Shuffle(len(posts), func(i, j int) {
		posts[i], posts[j] = posts[j], posts[i]
	})
	lib.FeedFetched.Add(ctx, 1)
	lib.Logger.Info(ctx, "feed.fetched", map[string]interface{}{"count": len(posts)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, map[string]interface{}{"feed": posts, "count": len(posts)}, 200)
}

// Notifications endpoint
func notificationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	start := time.Now()
	var req struct {
		UserID  string `json:"user_id"`
		Message string `json:"message"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	notification := store.CreateNotification(req.UserID, req.Message)
	lib.NotificationSent.Add(ctx, 1)
	lib.Logger.Info(ctx, "notification.sent", map[string]interface{}{"user_id": req.UserID, "notification_id": notification["id"]})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(ctx, latency)
	jsonResponse(w, notification, 201)
}

// Metrics endpoint (in-memory JSON metrics — unchanged contract)
func metricsHandler(w http.ResponseWriter, r *http.Request) {
	metrics := lib.GetMetricsFormatted()
	jsonResponse(w, metrics, 200)
}

// Events endpoint — recent business events from the in-memory ring buffer
func eventsHandler(w http.ResponseWriter, r *http.Request) {
	events := lib.RecentEvents(50)
	jsonResponse(w, map[string]interface{}{"events": events, "count": len(events)}, 200)
}

var otelInstrumentNames = []string{
	"users.list",
	"user.created",
	"posts.list",
	"post.created",
	"feed.fetched",
	"notification.sent",
	"http.route.latency_ms",
	"http.server.request.duration",
	"http.server.request.body.size",
	"http.server.response.body.size",
}

// Agent manifest — machine-readable service description
func agentManifestHandler(w http.ResponseWriter, r *http.Request) {
	type endpoint struct {
		Method      string `json:"method"`
		Path        string `json:"path"`
		Description string `json:"description"`
	}
	manifest := map[string]interface{}{
		"service": serviceName(),
		"version": serviceVersion,
		"domain":  "social",
		"endpoints": []endpoint{
			{"GET", "/", "Live dashboard (HTML)"},
			{"GET", "/health", "Health check"},
			{"GET", "/api/users", "List users"},
			{"POST", "/api/users", "Create user {username, email}"},
			{"GET", "/api/posts", "List posts"},
			{"POST", "/api/posts", "Create post {user_id, content}"},
			{"GET", "/api/feed", "Fetch shuffled feed"},
			{"POST", "/api/notifications", "Send notification {user_id, message}"},
			{"GET", "/api/metrics", "In-memory business metrics (JSON)"},
			{"GET", "/api/events", "Recent business events (ring buffer)"},
			{"GET", "/api/agent", "This manifest"},
			{"GET", "/llms.txt", "Plain-text service description for LLM agents"},
		},
		"otel": map[string]interface{}{
			"traces":  true,
			"metrics": otelInstrumentNames,
			"logs":    true,
		},
		"health": "/health",
	}
	jsonResponse(w, manifest, 200)
}

// llms.txt — plain-text service description for LLM agents
func llmsTxtHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintf(w, `# hello-otel-social

hello-otel-social is a Go social-network demo service (part of the hello-otel
suite) exposing users, posts, a feed, and notifications over a JSON HTTP API,
fully instrumented with OpenTelemetry: traces, metrics, and logs all exported
over OTLP gRPC (OTEL_EXPORTER_OTLP_ENDPOINT, default localhost:4317) under
service.name "%s", with structured slog JSON logs on stdout that carry
trace_id/span_id correlation.

## Endpoints
- GET  /              Dashboard (HTML)
- GET  /health        Health check -> {"status":"ok"}
- GET  /api/users     List users
- POST /api/users     Create user {username, email}
- GET  /api/posts     List posts
- POST /api/posts     Create post {user_id, content}
- GET  /api/feed      Fetch shuffled feed
- POST /api/notifications  Send notification {user_id, message}
- GET  /api/metrics   Business metrics (JSON)
- GET  /api/events    Recent business events
- GET  /api/agent     Machine-readable agent manifest (JSON)

## OpenTelemetry signals
- Traces: one server span per route (span names: /, /health, /api/users,
  /api/posts, /api/feed, /api/notifications, /api/metrics, /api/events)
- Metrics: users.list, user.created, posts.list, post.created, feed.fetched,
  notification.sent (counters); http.route.latency_ms (histogram, ms);
  plus otelhttp built-ins (http.server.request.duration, ...)
- Logs: OTLP log records bridged from slog, trace-correlated

## Health
GET /health returns 200 when the service is up.
`, serviceName())
}

func main() {
	ctx := context.Background()
	otelShutdown := setupOTel(ctx)
	if os.Getenv("ENABLE_TRAFFIC_GEN") == "true" {
		go lib.StartTrafficGenerator(store)
	}

	mux := http.NewServeMux()
	mux.Handle("/health", traced(http.HandlerFunc(healthHandler), "/health"))
	mux.Handle("/api/users", traced(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			userCreateHandler(w, r)
		} else {
			usersListHandler(w, r)
		}
	}), "/api/users"))
	mux.Handle("/api/posts", traced(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			postCreateHandler(w, r)
		} else {
			postsListHandler(w, r)
		}
	}), "/api/posts"))
	mux.Handle("/api/feed", traced(http.HandlerFunc(feedHandler), "/api/feed"))
	mux.Handle("/api/notifications", traced(http.HandlerFunc(notificationsHandler), "/api/notifications"))
	mux.Handle("/api/metrics", traced(http.HandlerFunc(metricsHandler), "/api/metrics"))
	mux.Handle("/api/events", traced(http.HandlerFunc(eventsHandler), "/api/events"))
	mux.Handle("/api/agent", http.HandlerFunc(agentManifestHandler))
	mux.Handle("/llms.txt", http.HandlerFunc(llmsTxtHandler))
	mux.Handle("/", traced(http.HandlerFunc(dashboardHandler), "/"))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{Addr: ":" + port, Handler: mux}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("[startup] Starting hello-otel-social server on :%s\n", port)
		errCh <- srv.ListenAndServe()
	}()

	sigCtx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-errCh:
		log.Fatalf("Server failed: %v", err)
	case <-sigCtx.Done():
		log.Println("[shutdown] signal received, draining...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[shutdown] http server: %v", err)
	}
	if err := otelShutdown(shutdownCtx); err != nil {
		log.Printf("[shutdown] otel: %v", err)
	}
	log.Println("[shutdown] complete")
}
