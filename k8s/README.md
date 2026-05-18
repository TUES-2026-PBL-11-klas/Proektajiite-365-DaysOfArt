# Kubernetes Manifests

Apply order:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl -n days-of-art create secret generic backend-secrets \
  --from-literal=database-url="postgresql://USER:PASSWORD@HOST:5432/postgres"
kubectl apply -f k8s/
```

Replace the placeholder `ghcr.io/example/...` images with the images built by the
project CI/CD pipeline before deploying.
