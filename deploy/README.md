# Kubernetes deployment contract

Atlas publishes two independently versioned frontend images from this
repository: `atlas-portal` and `atlas-hermes`. Each is a separate Kubernetes
component below `base/`; shared Nginx image configuration remains in
`deploy/nginx.conf`.

- `base/portal/` and `base/hermes/` each own a Deployment, Service, and ServiceAccount.
- `config/` documents build-time Vite configuration.
- `ingress/` owns the portal and Hermes administration UI routes.

The private `heliantheon/applications` repository pins this contract and owns
both promoted image versions in the sibling `overlay/` directory.

