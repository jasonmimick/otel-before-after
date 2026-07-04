package lib

import (
	"context"
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel/trace"
)

// fanoutHandler duplicates every slog record to multiple handlers:
// stdout JSON (existing behavior) and the OTel log bridge (OTLP export).
type fanoutHandler struct {
	handlers []slog.Handler
}

func (f fanoutHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range f.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (f fanoutHandler) Handle(ctx context.Context, r slog.Record) error {
	var firstErr error
	for _, h := range f.handlers {
		if h.Enabled(ctx, r.Level) {
			if err := h.Handle(ctx, r.Clone()); err != nil && firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

func (f fanoutHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	next := make([]slog.Handler, len(f.handlers))
	for i, h := range f.handlers {
		next[i] = h.WithAttrs(attrs)
	}
	return fanoutHandler{handlers: next}
}

func (f fanoutHandler) WithGroup(name string) slog.Handler {
	next := make([]slog.Handler, len(f.handlers))
	for i, h := range f.handlers {
		next[i] = h.WithGroup(name)
	}
	return fanoutHandler{handlers: next}
}

// Slog fans out to stdout JSON and the otelslog bridge. The bridge uses the
// global LoggerProvider (a lazy delegate), so it starts exporting via OTLP as
// soon as main() sets the SDK provider — records carry trace/span context
// from the ctx passed to each log call.
var Slog = slog.New(fanoutHandler{handlers: []slog.Handler{
	slog.NewJSONHandler(os.Stdout, nil),
	otelslog.NewHandler("hello-otel-social"),
}})

type logger struct{}

func (l *logger) log(ctx context.Context, level slog.Level, event string, fields map[string]interface{}) {
	attrs := make([]any, 0, len(fields)*2+4)
	for k, v := range fields {
		attrs = append(attrs, k, v)
	}
	// Surface trace correlation in the stdout JSON too (the OTel bridge picks
	// the span context up from ctx automatically).
	if sc := trace.SpanContextFromContext(ctx); sc.IsValid() {
		attrs = append(attrs, "trace_id", sc.TraceID().String(), "span_id", sc.SpanID().String())
	}
	Slog.Log(ctx, level, event, attrs...)
	RecordEvent(level.String(), event, fields)
}

func (l *logger) Info(ctx context.Context, event string, fields map[string]interface{}) {
	l.log(ctx, slog.LevelInfo, event, fields)
}

func (l *logger) Warn(ctx context.Context, event string, fields map[string]interface{}) {
	l.log(ctx, slog.LevelWarn, event, fields)
}

func (l *logger) Error(ctx context.Context, event string, fields map[string]interface{}) {
	l.log(ctx, slog.LevelError, event, fields)
}

func (l *logger) Debug(ctx context.Context, event string, fields map[string]interface{}) {
	l.log(ctx, slog.LevelDebug, event, fields)
}

var Logger = &logger{}
