package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"hello-otel-social/lib"
)

var metricsData map[string]map[string]interface{}
var store *lib.Store

func init() {
	store = lib.NewStore()
	metricsData = make(map[string]map[string]interface{})
	go lib.StartTrafficGenerator(store)
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
	start := time.Now()
	users := store.GetUsers()
	lib.UsersList.Add(1)
	lib.Logger.Info("users.list", map[string]interface{}{"count": len(users)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, map[string]interface{}{"users": users, "count": len(users)}, 200)
}

func userCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	user := store.CreateUser(req.Username, req.Email)
	lib.UserCreated.Add(1)
	lib.Logger.Info("user.created", map[string]interface{}{"user_id": user["id"], "username": req.Username})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, user, 201)
}

// Posts endpoints
func postsListHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	posts := store.GetPosts()
	lib.PostsList.Add(1)
	lib.Logger.Info("posts.list", map[string]interface{}{"count": len(posts)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, map[string]interface{}{"posts": posts, "count": len(posts)}, 200)
}

func postCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	var req struct {
		UserID  string `json:"user_id"`
		Content string `json:"content"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	post := store.CreatePost(req.UserID, req.Content)
	lib.PostCreated.Add(1)
	lib.Logger.Info("post.created", map[string]interface{}{"post_id": post["id"], "user_id": req.UserID})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, post, 201)
}

// Feed endpoint
func feedHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	posts := store.GetPosts()
	// Shuffle posts to simulate feed order
	rand.Shuffle(len(posts), func(i, j int) {
		posts[i], posts[j] = posts[j], posts[i]
	})
	lib.FeedFetched.Add(1)
	lib.Logger.Info("feed.fetched", map[string]interface{}{"count": len(posts)})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, map[string]interface{}{"feed": posts, "count": len(posts)}, 200)
}

// Notifications endpoint
func notificationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	var req struct {
		UserID  string `json:"user_id"`
		Message string `json:"message"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	notification := store.CreateNotification(req.UserID, req.Message)
	lib.NotificationSent.Add(1)
	lib.Logger.Info("notification.sent", map[string]interface{}{"user_id": req.UserID, "notification_id": notification["id"]})
	latency := float64(time.Since(start).Milliseconds())
	lib.RequestLatency.Record(latency)
	jsonResponse(w, notification, 201)
}

// Metrics endpoint
func metricsHandler(w http.ResponseWriter, r *http.Request) {
	metrics := lib.GetMetricsFormatted()
	jsonResponse(w, metrics, 200)
}

// Dashboard HTML
func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, `
<!DOCTYPE html>
<html>
<head>
	<title>hello-otel Social</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: monospace; font-size: 14px; background: #f9fafb; color: #111; }
		.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
		header { margin-bottom: 24px; }
		h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
		.subtitle { font-size: 12px; color: #888; }
		.metrics-panel { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 16px; margin-bottom: 24px; }
		.metrics-panel h2 { font-weight: 600; color: #1e3a8a; margin-bottom: 12px; font-size: 14px; }
		.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
		.metric { background: white; border: 1px solid #dbeafe; border-radius: 4px; padding: 12px; }
		.metric-value { font-weight: 600; color: #374151; margin-bottom: 4px; }
		.metric-label { font-size: 11px; color: #2563eb; }
		.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
		.card { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; }
		.card h2 { font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 14px; }
		.card-list { space-y: 8px; }
		.list-item { border-bottom: 1px solid #f3f4f6; padding: 8px 0; font-size: 12px; }
		.list-item:last-child { border-bottom: none; }
		button { background: #f3f4f6; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-family: monospace; }
		button:hover { background: #e5e7eb; }
		.activity { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; margin-top: 16px; }
		.log { height: 300px; overflow-y: auto; font-size: 11px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-family: monospace; }
		.log-entry { margin-bottom: 4px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<header>
			<h1>hello-otel Social</h1>
			<p class="subtitle">Social media API with structured logging — users, posts, feed, notifications</p>
		</header>
		
		<div class="metrics-panel" id="metricsPanel">
			<h2>📊 Metrics (auto-refreshing every 2s)</h2>
			<div class="metrics-grid" id="metricsGrid">
				<p>Loading metrics...</p>
			</div>
		</div>
		
		<div class="grid">
			<div class="card">
				<h2>Users</h2>
				<button onclick="fetchUsers()">Refresh</button>
				<div class="card-list" id="usersList">
					<p>Loading...</p>
				</div>
			</div>
			
			<div class="card">
				<h2>Posts</h2>
				<button onclick="fetchPosts()">Refresh</button>
				<div class="card-list" id="postsList">
					<p>Loading...</p>
				</div>
			</div>
			
			<div class="card">
				<h2>Feed</h2>
				<button onclick="fetchFeed()">Refresh</button>
				<div class="card-list" id="feedList">
					<p>Loading...</p>
				</div>
			</div>
		</div>
		
		<div class="activity">
			<h2>Activity Log</h2>
			<div class="log" id="activityLog">
				<p style="color: #999;">Waiting for activity...</p>
			</div>
		</div>
	</div>
	
	<script>
		let log = [];
		
		function addLog(msg) {
			const time = new Date().toISOString().slice(11, 23);
			log.unshift('[' + time + '] ' + msg);
			log = log.slice(0, 30);
			updateLog();
		}
		
		function updateLog() {
			const logDiv = document.getElementById('activityLog');
			logDiv.innerHTML = log.map(e => '<div class="log-entry">' + e + '</div>').join('') || '<p style="color: #999;">No activity</p>';
		}
		
		async function fetchMetrics() {
			try {
				const res = await fetch('/api/metrics');
				const metrics = await res.json();
				const grid = document.getElementById('metricsGrid');
				const entries = Object.entries(metrics).slice(0, 8);
				grid.innerHTML = entries.map(function(entry) {
					const name = entry[0];
					const labels = entry[1];
					const first = Object.entries(labels)[0];
					const value = first ? (typeof first[1] === 'object' ? first[1].count : first[1]) : 0;
					return '<div class="metric"><div class="metric-value">' + value + '</div><div class="metric-label">' + name + '</div></div>';
				}).join('');
			} catch (e) { console.error('Failed to fetch metrics:', e); }
		}
		
		async function fetchUsers() {
			try {
				const res = await fetch('/api/users');
				const data = await res.json();
				const list = document.getElementById('usersList');
				list.innerHTML = data.users.map(u => '<div class="list-item"><strong>' + u.username + '</strong> · ' + u.email + '</div>').join('') || '<p>No users</p>';
				addLog('GET /api/users → ' + data.count + ' users');
			} catch (e) { console.error('Failed:', e); }
		}
		
		async function fetchPosts() {
			try {
				const res = await fetch('/api/posts');
				const data = await res.json();
				const list = document.getElementById('postsList');
				list.innerHTML = data.posts.slice(0, 5).map(p => '<div class="list-item">' + p.content.substring(0, 50) + '...</div>').join('') || '<p>No posts</p>';
				addLog('GET /api/posts → ' + data.count + ' posts');
			} catch (e) { console.error('Failed:', e); }
		}
		
		async function fetchFeed() {
			try {
				const res = await fetch('/api/feed');
				const data = await res.json();
				const list = document.getElementById('feedList');
				list.innerHTML = data.feed.slice(0, 5).map(p => '<div class="list-item">' + p.content.substring(0, 50) + '...</div>').join('') || '<p>No feed</p>';
				addLog('GET /api/feed → ' + data.count + ' posts');
			} catch (e) { console.error('Failed:', e); }
		}
		
		// Initial load
		fetchUsers();
		fetchPosts();
		fetchFeed();
		fetchMetrics();
		
		// Auto-refresh metrics every 2s
		setInterval(fetchMetrics, 2000);
	</script>
</body>
</html>
	`)
}

func main() {
	// Register handlers
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			userCreateHandler(w, r)
		} else {
			usersListHandler(w, r)
		}
	})
	http.HandleFunc("/api/posts", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			postCreateHandler(w, r)
		} else {
			postsListHandler(w, r)
		}
	})
	http.HandleFunc("/api/feed", feedHandler)
	http.HandleFunc("/api/notifications", notificationsHandler)
	http.HandleFunc("/api/metrics", metricsHandler)
	http.HandleFunc("/", dashboardHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("[startup] Starting hello-otel-social server on :%s\n", port)
	if err := http.ListenAndServe(":" + port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
