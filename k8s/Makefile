.PHONY: deploy-dev clean

# ClusterIPs (update these after deploying databases)
DEV_BACKEND_IP ?= 10.107.1.1


# Deploy databases first (they're shared or per-env)
deploy-databases:
	kubectl apply -k overlays/dev/database

# Development
deploy-dev:
	kustomize build overlays/dev | sed 's/DEV_BACKEND_CLUSTER_IP/$(DEV_BACKEND_IP)/g' | kubectl apply -f -
	helm upgrade --install istio-dev ./istio-chart -f istio-chart/values-dev.yaml --namespace dev --create-namespace


# Cleanup
clean-dev:
	kubectl delete -k overlays/dev
	helm uninstall istio-dev -n dev

