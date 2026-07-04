"""OpenTelemetry bootstrap — traces + metrics + logs over OTLP gRPC.

All three signals share one Resource (service.name) and one OTLP endpoint
(OTEL_EXPORTER_OTLP_ENDPOINT, default localhost:4317). Exporters are batch
based and fail soft: if no collector is reachable the app keeps running.
"""

import logging
from os import getenv

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Stdlib logger name used by lib/logger.py for structured business events.
BUSINESS_LOGGER_NAME = "hello-otel-fintech"


def init_otel(app=None):
    service_name = getenv("OTEL_SERVICE_NAME", "hello-otel-fintech-otel")
    endpoint = getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
    resource = Resource.create({"service.name": service_name})

    # --- Traces ---------------------------------------------------------
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True))
    )
    trace.set_tracer_provider(tracer_provider)

    # --- Metrics --------------------------------------------------------
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=endpoint, insecure=True),
        export_interval_millis=10_000,
    )
    metrics.set_meter_provider(
        MeterProvider(resource=resource, metric_readers=[metric_reader])
    )

    # --- Logs -----------------------------------------------------------
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=endpoint, insecure=True))
    )
    set_logger_provider(logger_provider)

    otlp_log_handler = LoggingHandler(
        level=logging.DEBUG, logger_provider=logger_provider
    )
    # Business logger: structured events from lib/logger.py. It prints its
    # own JSON to stdout, so it only needs the OTLP handler here.
    business_logger = logging.getLogger(BUSINESS_LOGGER_NAME)
    business_logger.setLevel(logging.DEBUG)
    business_logger.propagate = False
    business_logger.addHandler(otlp_log_handler)
    # Root logger: anything else in-process also ships over OTLP.
    logging.getLogger().addHandler(otlp_log_handler)

    if app is not None:
        FastAPIInstrumentor.instrument_app(app)


# Backwards-compatible alias (older code called init_tracing).
init_tracing = init_otel
