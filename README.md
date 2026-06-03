# 365 Days of Art

## Run locally (Docker Compose)

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# 1. Clone the repo
git clone https://github.com/TUES-2026-PBL-11-klas/Proektajiite-365-DaysOfArt.git
cd Proektajiite-365-DaysOfArt

# 2. Create your env file — ask a teammate for the real DATABASE_URL and JWT_SECRET_KEY
cp backend/.env.example backend/.env
# then open backend/.env and fill in the values

# 3. Start everything
docker compose up --build
```

Open **http://localhost:3000** in your browser. The backend API runs at **http://localhost:5001**.

To stop: `docker compose down`  
To rebuild after code changes: `docker compose up --build`

---

## Run locally (Kubernetes)

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Kubernetes enabled, or [minikube](https://minikube.sigs.k8s.io/)

```bash
# 1. Same env setup as above — create backend/.env first

# 2. Build images locally
docker build -t ghcr.io/tues-2026-pbl-11-klas/365-days-of-art-backend:latest ./backend
docker build -t ghcr.io/tues-2026-pbl-11-klas/365-days-of-art-frontend:latest ./frontend

# 3. Create namespace and secrets
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic backend-secrets \
  --from-env-file=backend/.env \
  --namespace days-of-art \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Apply all resources
kubectl apply -f k8s/

# 5. Access the app
kubectl port-forward -n days-of-art svc/frontend-service 3000:3000
```

Open **http://localhost:3000**.

> Note: the ingress uses `host: days-of-art.local`. For port-forward access you don't need to configure that.

---

## Seed drawing themes

Load the 365 drawing themes into the database once:

```bash
cd backend
python3 -m scripts.seed_topics
```

The command is safe to run multiple times — existing themes are skipped.

---

## Architecture

```
Browser → http://localhost:3000
        → frontend (Next.js, port 3000)
        → backend  (Flask, port 5000 internal / 5001 on host)
        → Supabase (external PostgreSQL)
        → Redis    (background jobs)
```

## CI/CD

Every push to `main`:
1. Runs backend tests and frontend lint
2. Builds and pushes Docker images to GHCR
3. On success — deploys to the Kubernetes cluster via Helm (CD workflow)
