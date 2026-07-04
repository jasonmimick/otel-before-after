package lib

import (
	"fmt"
	"sync"
	"time"
)

type Store struct {
	usersMutex sync.RWMutex
	postsMutex sync.RWMutex
	notifMutex sync.RWMutex

	users         []map[string]interface{}
	posts         []map[string]interface{}
	notifications []map[string]interface{}
	userCounter   int
	postCounter   int
	notifCounter  int
}

func NewStore() *Store {
	return &Store{
		users: []map[string]interface{}{
			{"id": "u1", "username": "alice", "email": "alice@example.com", "created_at": "2026-01-15T10:00:00Z"},
			{"id": "u2", "username": "bob", "email": "bob@example.com", "created_at": "2026-02-20T10:00:00Z"},
			{"id": "u3", "username": "carol", "email": "carol@example.com", "created_at": "2026-03-10T10:00:00Z"},
		},
		posts: []map[string]interface{}{
			{"id": "p1", "user_id": "u1", "content": "Hello world!", "created_at": "2026-06-28T10:15:00Z"},
			{"id": "p2", "user_id": "u2", "content": "Check out this cool thing", "created_at": "2026-06-28T11:30:00Z"},
		},
		notifications: []map[string]interface{}{},
		userCounter:   3,
		postCounter:   2,
	}
}

func (s *Store) GetUsers() []map[string]interface{} {
	s.usersMutex.RLock()
	defer s.usersMutex.RUnlock()
	return append([]map[string]interface{}{}, s.users...)
}

func (s *Store) CreateUser(username, email string) map[string]interface{} {
	s.usersMutex.Lock()
	defer s.usersMutex.Unlock()

	s.userCounter++
	user := map[string]interface{}{
		"id":         fmt.Sprintf("u%d", s.userCounter),
		"username":   username,
		"email":      email,
		"created_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	s.users = append(s.users, user)
	return user
}

func (s *Store) GetPosts() []map[string]interface{} {
	s.postsMutex.RLock()
	defer s.postsMutex.RUnlock()
	return append([]map[string]interface{}{}, s.posts...)
}

func (s *Store) CreatePost(userID, content string) map[string]interface{} {
	s.postsMutex.Lock()
	defer s.postsMutex.Unlock()

	s.postCounter++
	post := map[string]interface{}{
		"id":         fmt.Sprintf("p%d", s.postCounter),
		"user_id":    userID,
		"content":    content,
		"created_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	s.posts = append(s.posts, post)
	return post
}

func (s *Store) CreateNotification(userID, message string) map[string]interface{} {
	s.notifMutex.Lock()
	defer s.notifMutex.Unlock()

	s.notifCounter++
	notification := map[string]interface{}{
		"id":         fmt.Sprintf("n%d", s.notifCounter),
		"user_id":    userID,
		"message":    message,
		"created_at": time.Now().UTC().Format(time.RFC3339Nano),
	}
	s.notifications = append(s.notifications, notification)
	return notification
}
