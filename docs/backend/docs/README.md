# API documentation (local only)

This folder is listed in `.gitignore`, so nothing here is committed.

| File | Purpose |
|---|---|
| `openapi.yaml` | OpenAPI 3.0.3 spec covering all 87 operations. Source of truth. |
| `index.html` | Swagger UI viewer with the spec embedded. Open it by double-clicking. |
| `build-viewer.cjs` | Rebuilds `index.html` after you edit `openapi.yaml`. |

## View

- **Double-click `docs/index.html`.** It works offline from disk, but needs internet for the Swagger UI CDN assets.
- Or import `openapi.yaml` into Postman, Insomnia, or https://editor.swagger.io.

## Update

1. Edit `docs/openapi.yaml`.
2. Run `node docs/build-viewer.cjs`.

## Using "Try it out"

1. Pick the server in the Servers dropdown (default `http://127.0.0.1:8001/api`).
2. Call `POST /login` and copy `data.token`.
3. Click **Authorize** and paste the token. Do not include the `Bearer ` prefix.

When the page is opened from `file://`, browsers send `Origin: null`. If the backend's CORS config rejects that, serve the folder instead, for example `npx serve docs`.
