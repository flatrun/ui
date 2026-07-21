## Production Deployment

### Build

```bash
npm run build
```

This creates a `dist/` directory with optimized static files.

### Serving with Nginx

```nginx
server {
    listen 80;
    server_name flatrun.example.com;
    root /var/www/flatrun-ui/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker Deployment

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Troubleshooting

**Cannot connect to agent:**
- Verify the agent is running: `systemctl status flatrun-agent`
- Check `VITE_API_URL` is correct in `.env.local`
- Ensure CORS is configured if running on different domains

**Authentication fails:**
- Verify the API key matches the agent's configuration
- Check the browser console for specific error messages
- Ensure the JWT secret is properly set in the agent config

**UI shows no deployments:**
- Confirm the agent's `deployments_path` is accessible
- Check that deployments have valid `docker-compose.yml` files
