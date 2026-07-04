// otel.go — full CNCF OpenTelemetry setup: traces + metrics + logs over OTLP gRPC.
//
// All three providers share one resource (service.name / service.version) and
// export to the same OTLP endpoint (OTEL_EXPORTER_OTLP_ENDPOINT, default
// localhost:4317, insecure). Exporters fail soft: if the collector is
// unreachable the app still starts and serves traffic.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	logglobal "go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

const serviceVersion = "1.0.0"

func serviceName() string {
	if v := os.Getenv("OTEL_SERVICE_NAME"); v != "" {
		return v
	}
	return "hello-otel-social-otel"
}

func otlpEndpoint() string {
	if v := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"); v != "" {
		return v
	}
	return "localhost:4317"
}

// setupOTel wires up tracer, meter and logger providers and returns a single
// shutdown function that flushes and closes all of them.
func setupOTel(ctx context.Context) func(context.Context) error {
	endpoint := otlpEndpoint()

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName()),
			semconv.ServiceVersionKey.String(serviceVersion),
		),
	)
	if err != nil {
		log.Printf("[otel] resource error: %v", err)
		res = resource.Default()
	}

	var shutdowns []func(context.Context) error

	// --- Traces ---
	traceExp, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("[otel] trace exporter error: %v", err)
	} else {
		tp := sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(traceExp),
			sdktrace.WithResource(res),
		)
		otel.SetTracerProvider(tp)
		shutdowns = append(shutdowns, tp.Shutdown)
	}

	// --- Metrics ---
	metricExp, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithEndpoint(endpoint),
		otlpmetricgrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("[otel] metric exporter error: %v", err)
	} else {
		mp := sdkmetric.NewMeterProvider(
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExp,
				sdkmetric.WithInterval(10*time.Second))),
			sdkmetric.WithResource(res),
		)
		otel.SetMeterProvider(mp)
		shutdowns = append(shutdowns, mp.Shutdown)
	}

	// --- Logs ---
	logExp, err := otlploggrpc.New(ctx,
		otlploggrpc.WithEndpoint(endpoint),
		otlploggrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("[otel] log exporter error: %v", err)
	} else {
		lp := sdklog.NewLoggerProvider(
			sdklog.WithProcessor(sdklog.NewBatchProcessor(logExp)),
			sdklog.WithResource(res),
		)
		// The otelslog bridge in lib/ resolves the global provider lazily,
		// so setting it here activates OTLP log export app-wide.
		logglobal.SetLoggerProvider(lp)
		shutdowns = append(shutdowns, lp.Shutdown)
	}

	log.Printf("[otel] providers initialized (endpoint=%s service=%s signals=traces,metrics,logs)", endpoint, serviceName())

	return func(ctx context.Context) error {
		var errs []error
		for _, fn := range shutdowns {
			if err := fn(ctx); err != nil {
				errs = append(errs, err)
			}
		}
		return errors.Join(errs...)
	}
}

// traced wraps a handler with otelhttp, producing server spans and (via the
// global MeterProvider) the built-in http.server.* metrics.
func traced(h http.Handler, name string) http.Handler {
	return otelhttp.NewHandler(h, name)
}
