# Atlas operations interface matrix

This document records the management contract consumed by Atlas. The backend
handlers are the source of truth; UI routes and forms must not infer fields from
legacy mocks.

## Hermes

| Area                           | Backend contract                                                                                                 | Atlas surface                                           | Status before rewrite                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Domains                        | `GET/POST /api/domains`, `GET/PATCH/DELETE /api/domains/:domain_id`                                              | Domain picker, create, detail, edit, destructive action | CRUD present                                               |
| Domain identity providers      | `GET/POST /api/domains/:domain_id/idp-configs`, `GET/PATCH/DELETE /api/domains/:domain_id/idp-configs/:idp_type` | Domain identity-provider policy                         | Wrong legacy `/idps` path and incomplete mutations         |
| IDP credentials                | `GET/POST /api/idp-keys`, `GET/PATCH/DELETE /api/idp-keys/:idp_type/:t_app_id`                                   | Global provider credential inventory                    | Missing                                                    |
| Services                       | `GET/POST /api/domains/:domain_id/services`, `GET/PATCH/DELETE /api/domains/:domain_id/services/:service_id`     | Service workbench                                       | CRUD present                                               |
| Service challenge policy       | `GET/POST /api/domains/:domain_id/services/:service_id/challenge-settings`, `PATCH/DELETE .../:type`             | Challenge and rate-limit policy                         | Missing                                                    |
| Service application grants     | `GET .../services/:service_id/applications`, `GET/PUT .../applications/:app_id/relations`                        | Grant matrix and graph                                  | Present                                                    |
| Applications                   | `GET/POST /api/domains/:domain_id/applications`, `GET/PATCH/DELETE .../:app_id`                                  | Application workbench                                   | CRUD present                                               |
| Application secret             | `GET .../applications/:app_id/secrets/:secret_type`                                                              | One-time secret reveal/copy                             | Missing                                                    |
| Application identity providers | `GET/POST .../applications/:app_id/idp-configs`, `PATCH/DELETE .../:idp_type`                                    | Application sign-in policy                              | Present, but fields drift from backend DTO                 |
| Application service grants     | `GET .../applications/:app_id/relations`                                                                         | Service permission view                                 | Present                                                    |
| Relationships                  | `GET/POST/PATCH/DELETE /api/relationships`                                                                       | Relationship list, editor, graph                        | Update missing                                             |
| Scoped relationships           | `GET/POST .../applications/:app_id/services/:service_id/relationships`, `PATCH/DELETE .../:relationship_id`      | Application-service relationship workbench              | Backend response identifier added with regression coverage |
| Groups                         | `GET/POST /api/groups`, `GET/PATCH/DELETE /api/groups/:group_id`                                                 | Group workbench                                         | Delete missing; create request omits required `service_id` |
| Group members                  | `GET/POST /api/groups/:group_id/members`                                                                         | Membership editor                                       | Read-only; full-set mutation not wired                     |

Hermes list endpoints use cursor pagination and return `{ items, next? }`.
Domain and IDP configuration lists return arrays. Mutations use JSON Merge Patch
semantics where the backend DTO uses optional patch values.

Scoped relationship list and create responses expose `relationship_id`, the
opaque identifier required by scoped `PATCH` and `DELETE`. Generic relationship
mutations continue to use the documented composite key.

## Chaos

| Area            | Backend contract                                                              | Atlas surface                              | Status before rewrite                       |
| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Templates       | `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/:id`              | Template inventory and editor              | Present                                     |
| Preview         | `POST /api/templates/:id/render` with `{ data }`                              | Rendered subject/body preview              | Present                                     |
| Delivery        | `POST /api/mail` with recipient, template, variables/data and optional expiry | Delivery composer and accepted delivery ID | Partial response/input typing               |
| Object upload   | `POST /api/presign`, followed by direct `PUT` to `upload_url`                 | Upload queue and public URL result         | Incorrect legacy `/files` multipart request |
| Historical logs | `GET /api/logs` with bounded filters                                          | Structured log explorer                    | Present                                     |
| Live logs       | `GET /api/logs/stream` as authenticated SSE                                   | Live log explorer                          | Present                                     |

Chaos has no file-list or object-delete management endpoint. Atlas therefore
shows the current upload queue and returned object URLs only; it must not imply
that it can browse or delete the whole bucket.

Chaos template handlers and Atlas consume one snake_case contract. The previous
PascalCase persistence-model compatibility path was removed after the backend
contract was deployed.

## Rewrite completion

- Hermes service, application, group and relationship collections follow every
  opaque cursor until completion where a full dataset is required; interactive
  lists expose explicit load-more controls and server-side filters.
- Domain workspaces query groups and relationships through their visible service
  IDs instead of loading global datasets and filtering them in the browser.
- Full service and application creation pages are the only creation paths, so
  secret generation, redirect/origin policy, logo and token expiry fields are
  not discarded by simplified dialogs.
- Group membership mutation, challenge policy, domain/application IDP policy,
  IDP credentials, relationship update/delete and explicit client-secret reveal
  are wired to their authoritative endpoints.
- Merge Patch editors send `null` when an existing nullable override is cleared,
  while create requests omit optional empty values.
- Chaos template CRUD/render/send, bounded historical/live log queries and
  presigned direct uploads match the handler request and response contracts.

## UI behavior required by the contract

- Every server-backed view has loading, empty, error and retry states.
- Destructive operations require an explicit confirmation and preserve the
  current context when the request fails.
- Secret values are fetched only after an explicit user action and are not
  persisted in browser storage.
- Cursor pagination uses the opaque `next` token unchanged.
- Uploads request a presigned URL first, upload directly with the returned URL,
  and only present the resulting public URL after the object-store request
  succeeds.
- Log filters remain bounded; Atlas never accepts or forwards raw LogQL.
