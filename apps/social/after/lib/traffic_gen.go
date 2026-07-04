package lib

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"go.opentelemetry.io/otel"
)

var trafficTracer = otel.Tracer("hello-otel-social.traffic_gen")

func StartTrafficGenerator(store *Store) {
	fmt.Println("[traffic-gen] Starting mock social traffic generator")

	ticker := time.NewTicker(time.Duration(3+rand.Intn(4)) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		action := rand.Float64()
		if action < 0.15 {
			simulateUserCreate(store)
		} else if action < 0.35 {
			simulatePostCreate(store)
		} else if action < 0.55 {
			simulateUsersList(store)
		} else if action < 0.7 {
			simulatePostsList(store)
		} else if action < 0.85 {
			simulateFeed(store)
		} else {
			simulateNotification(store)
		}

		// Reset ticker with new random duration
		ticker.Reset(time.Duration(3+rand.Intn(4)) * time.Second)
	}
}

func simulateUserCreate(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.user_create")
	defer span.End()

	username := fmt.Sprintf("user-%d", rand.Intn(100000))
	user := store.CreateUser(username, username+"@example.com")
	UserCreated.Add(ctx, 1)
	Logger.Info(ctx, "user.created", map[string]interface{}{
		"user_id":  user["id"],
		"username": username,
		"source":   "traffic_gen",
	})
}

func simulatePostCreate(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.post_create")
	defer span.End()

	users := store.GetUsers()
	if len(users) == 0 {
		return
	}
	user := users[rand.Intn(len(users))]
	contents := []string{
		"Hello world!", "Just shipped a new feature",
		"Coffee o'clock", "Spans all the way down",
	}
	post := store.CreatePost(user["id"].(string), contents[rand.Intn(len(contents))])
	PostCreated.Add(ctx, 1)
	Logger.Info(ctx, "post.created", map[string]interface{}{
		"post_id": post["id"],
		"user_id": user["id"],
		"source":  "traffic_gen",
	})
}

func simulateUsersList(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.users_list")
	defer span.End()

	users := store.GetUsers()
	UsersList.Add(ctx, 1)
	Logger.Info(ctx, "users.list", map[string]interface{}{
		"count":  len(users),
		"source": "traffic_gen",
	})
}

func simulatePostsList(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.posts_list")
	defer span.End()

	posts := store.GetPosts()
	PostsList.Add(ctx, 1)
	Logger.Info(ctx, "posts.list", map[string]interface{}{
		"count":  len(posts),
		"source": "traffic_gen",
	})
}

func simulateFeed(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.feed")
	defer span.End()

	posts := store.GetPosts()
	FeedFetched.Add(ctx, 1)
	Logger.Info(ctx, "feed.fetched", map[string]interface{}{
		"count":  len(posts),
		"source": "traffic_gen",
	})
}

func simulateNotification(store *Store) {
	ctx, span := trafficTracer.Start(context.Background(), "social.sim.notification")
	defer span.End()

	users := store.GetUsers()
	if len(users) == 0 {
		return
	}

	user := users[rand.Intn(len(users))]
	userID := user["id"].(string)
	messages := []string{"You have a new like", "Someone replied to you", "Check out this post", "New follower"}
	message := messages[rand.Intn(len(messages))]

	notification := store.CreateNotification(userID, message)
	NotificationSent.Add(ctx, 1)
	Logger.Info(ctx, "notification.sent", map[string]interface{}{
		"user_id":         userID,
		"notification_id": notification["id"],
		"message":         message,
	})
}
