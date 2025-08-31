# Uro Client Template API

A starter API for Uro AI clients who want to host their own database and expose a thin server to their applications.
The project is built with [Express](https://expressjs.com/) and demonstrates how to proxy requests to Uro's
platform, manage jobs, handle webhooks, and upload images.

## Online Resources

- **Landing & Playground:** [FluxUro.ai](https://fluxuro.ai)
- **Client API Base URL:** [`https://client-api.xomali.ai`](https://client-api.xomali.ai)

## Features

- List and run Uro AI models
- Track and manage generation jobs
- Receive job-completion webhooks
- Upload generated images to your own database

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/uro-client-template-api.git
   cd uro-client-template-api
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # update values in .env
   ```
4. **Run database migrations** (optional)
   ```bash
   npm run migrate
   ```
5. **Start the server**
   ```bash
   npm run dev   # for development
   npm start     # for production
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_URL` | Base URL for the Uro platform |
| `WEBHOOK_URL` | URL exposed for receiving Uro webhooks |
| `APP_URL` | URL of your client application |
| `PORT` | Port for this API server |
| `API_PORT` | Port used by the Uro backend |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | Database connection info |
| `URO_API_KEY` | API key for communicating with the Uro platform |
| `API_KEY` | Secret key expected in the `api-key` request header |
| `LOG_LEVEL` | Logging verbosity (`info`, `debug`, etc.) |
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting (ms) |
| `RATE_LIMIT_MAX` | Max requests per window |

## API Usage

All endpoints require an `api-key` header matching your `API_KEY`.
The base path for authenticated routes is `/api`.

### Models

- `GET /api/models` – List available models
- `GET /api/models/model/:id` – Retrieve a model by ID
- `POST /api/models/run-model` – Execute a model

### Jobs

- `GET /api/jobs` – List jobs
- `GET /api/jobs/job/:id` – Get job details
- `POST /api/jobs/delete-job` – Delete a job
- `POST /api/jobs/update-job-publicity` – Toggle job visibility
- `GET /api/jobs/images` – List images from jobs

### Image Upload

- `POST /api/upload-image` – Store a generated image

### Webhooks

- `POST /webhooks/model/:job_id` – Job completion for single model requests
- `POST /webhooks/workflow/:job_id` – Job completion for workflows

### Example Request

```bash
curl -H "api-key: $API_KEY" \
     https://client-api.xomali.ai/api/models
```

## License

[MIT](LICENSE)
