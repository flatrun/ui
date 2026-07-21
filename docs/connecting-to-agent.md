## Connecting to FlatRun Agent

The UI requires a running FlatRun Agent instance. See the [FlatRun Agent documentation](https://github.com/flatrun/agent) for installation instructions.

### Environment Configuration

Create a `.env.local` file:

```bash
# FlatRun Agent API URL
VITE_API_URL=http://localhost:8090
```

For production:

```bash
VITE_API_URL=https://your-server.com/api
```

### Authentication

The UI uses the API key configured in the agent's `config.yml`. Enter the key when prompted by the login form.

### CORS Configuration

If the UI runs on a different domain or port than the agent, ensure the agent's CORS settings include your UI URL:

```yaml
# In agent's config.yml
api:
  enable_cors: true
  allowed_origins:
    - http://localhost:5173
    - https://your-ui-domain.com
```
