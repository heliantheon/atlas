# Build-time configuration

Atlas apps are static Vite builds. Their `VITE_*` values are compiled into
each immutable image and are not Kubernetes runtime Secrets. Source defaults
remain in `apps/<app>/.env.production`; changing them requires a new image tag.

