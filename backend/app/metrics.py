import time

from flask import g, request
from prometheus_client import Counter, Gauge, Histogram, make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware

REQUEST_COUNT = Counter(
    "app_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint"],
)

ACTIVE_USERS = Gauge("app_active_users", "Currently active users")

SUBMISSION_COUNT = Counter(
    "app_submissions_total",
    "Total drawings submitted",
)

LIKE_COUNT = Counter(
    "app_likes_total",
    "Total likes added or removed",
    ["action"],  # "add" or "remove"
)


def register_metrics(app):
    """Attach Prometheus /metrics endpoint and per-request instrumentation."""

    @app.before_request
    def _start_timer():
        g._start_time = time.time()

    @app.after_request
    def _record_metrics(response):
        latency = time.time() - getattr(g, "_start_time", time.time())
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.path,
            status=response.status_code,
        ).inc()
        REQUEST_LATENCY.labels(endpoint=request.path).observe(latency)
        return response

    app.wsgi_app = DispatcherMiddleware(
        app.wsgi_app, {"/metrics": make_wsgi_app()}
    )
