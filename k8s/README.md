# Kubernetes — 365 Days of Art

## Images

Built and pushed by CI/CD:

- `ghcr.io/tues-2026-pbl-11-klas/365-days-of-art-backend:latest`
- `ghcr.io/tues-2026-pbl-11-klas/365-days-of-art-frontend:latest`

## Deploy

```bash
# 1. Create the namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (run once; values come from backend/.env)
kubectl -n days-of-art create secret generic backend-secrets \
  --from-literal=database-url="<DATABASE_URL>" \
  --from-literal=jwt-secret-key="<JWT_SECRET_KEY>"

# 3. Deploy everything
kubectl apply -f k8s/

# 4. Access the app
kubectl port-forward -n days-of-art svc/frontend-service 3000:3000
# → http://localhost:3000
```

## Architecture

```
Browser → localhost:3000
        → frontend pod  (Next.js, proxies /api/* server-side)
        → backend-service:5000  (ClusterIP, internal only)
        → backend pod  (Flask)
        → Supabase (external DB) + redis-service:6379
```

The backend is ClusterIP — the browser never reaches it directly.

## CronJobs

| Job | Schedule | Command |
|-----|----------|---------|
| `select-daily-prompts` | 00:00 daily | `flask select-daily-prompts` |
| `recalculate-recommendations` | 00:30 daily | `flask recalculate-recommendations` |
