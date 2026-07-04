"""Structured business logger.

Every log line goes two places:
  1. stdout as a single JSON line (unchanged behavior), and
  2. the stdlib logger "hello-otel-fintech", which otel_init attaches an
     OpenTelemetry LoggingHandler to — so records export over OTLP gRPC
     with trace correlation (trace_id/span_id from the active span, which
     FastAPIInstrumentor provides inside request handlers).
"""

import json
import logging
from datetime import datetime

from opentelemetry import trace as _otel_trace

from lib.events import record_event

_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warn": logging.WARNING,
    "error": logging.ERROR,
}

# OTLP handler is attached to this logger by otel_init.init_otel().
_py_logger = logging.getLogger("hello-otel-fintech")
_py_logger.setLevel(logging.DEBUG)
_py_logger.propagate = False


def _current_trace_ids():
    ctx = _otel_trace.get_current_span().get_span_context()
    if ctx.is_valid:
        return format(ctx.trace_id, "032x"), format(ctx.span_id, "016x")
    return "", ""


def log(level, event, fields=None):
    if fields is None:
        fields = {}

    trace_id, span_id = _current_trace_ids()
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "level": level,
        "event": event,
        "traceId": trace_id,
        "spanId": span_id,
        "fields": fields,
    }
    print(json.dumps(entry))
    record_event(level, event, fields)

    # Ship over OTLP with the business fields as log attributes. The
    # LoggingHandler adds trace context from the active span automatically.
    attrs = {
        f"app.{k}": (v if isinstance(v, (str, int, float, bool)) else str(v))
        for k, v in fields.items()
        if v is not None
    }
    _py_logger.log(_LEVELS.get(level, logging.INFO), event, extra=attrs)


class Logger:
    def debug(self, event, fields=None):
        log("debug", event, fields)

    def info(self, event, fields=None):
        log("info", event, fields)

    def warn(self, event, fields=None):
        log("warn", event, fields)

    def error(self, event, fields=None):
        log("error", event, fields)


logger = Logger()
