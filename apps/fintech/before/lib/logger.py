import json
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

# Global trace ID
global_trace_id = generate_uuid()

def set_trace_id(trace_id):
    global global_trace_id
    global_trace_id = trace_id

def get_trace_id():
    return global_trace_id

def log(level, event, fields=None):
    if fields is None:
        fields = {}
    
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "level": level,
        "event": event,
        "traceId": get_trace_id(),
        "spanId": generate_uuid(),
        "fields": fields
    }
    print(json.dumps(entry))

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
