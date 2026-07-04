"""In-memory ring buffer of recent business events (stdlib only).

Fed by lib/logger.log(), i.e. the exact same code paths that emit
structured business logs. Served by GET /api/events for the dashboard's
live event stream.
"""

import itertools
from collections import deque
from datetime import datetime, timezone

_BUFFER_SIZE = 100
_events = deque(maxlen=_BUFFER_SIZE)
_seq = itertools.count(1)


def record_event(level, event, fields=None):
    _events.append({
        "seq": next(_seq),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "level": level,
        "event": event,
        "fields": fields or {},
    })


def get_events(limit=50):
    """Most recent events, newest first."""
    items = list(_events)
    return items[-limit:][::-1]
