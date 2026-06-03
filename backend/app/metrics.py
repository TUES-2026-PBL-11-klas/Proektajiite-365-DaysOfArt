from prometheus_client import Counter, Histogram, Gauge, make_wsgi_app
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


def register_metrics(app):
    """Attach /metrics endpoint and before/after request hooks."""

    import time

    @app.before_request
    def _start_timer():
        from flask import g
        g._start_time = time.time()

    @app.after_request
    def _record_metrics(response):
        from flask import g, request
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