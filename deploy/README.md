# Kubernetes deployment contract

Atlas publishes three independently versioned frontend images from this
repository: `atlas`, `hermes-ui`, and `chaos-ui`. Each is a separate Kubernetes
component below `base/`; shared Nginx image configuration remains in
`deploy/nginx.conf`.

- `base/portal/`, `base/hermes/`, and `base/chaos/` each own a Deployment,
  Service, and ServiceAccount. Source directories follow the Atlas app names;
  runtime resources use product-oriented names.
- `config/` documents build-time Vite configuration.
- `ingress/` owns the Atlas, Hermes, and Chaos administration UI routes.

The private `heliantheons/applications` repository pins this contract and owns
the promoted image versions in the sibling `overlay/` directory.
