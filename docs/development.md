## Development

### Prerequisites

- Node.js 18 or later and npm

### Setup

```bash
npm install
npm run dev
```

The development server starts at `http://localhost:5173`.

### Project Structure

```
ui/
├── src/
│   ├── assets/          Static assets and global styles
│   ├── components/      Reusable Vue components (DataTable, etc.)
│   ├── layouts/         Page layouts (DashboardLayout)
│   ├── views/           Page components (HomeView, DeploymentsView, etc.)
│   ├── stores/          Pinia stores (auth, deployments)
│   ├── router/          Vue Router configuration
│   ├── services/        API client services (axios instances)
│   ├── types/           TypeScript type definitions
│   ├── App.vue          Root component
│   └── main.ts          Application entry point
├── public/              Public static files
└── index.html           HTML entry point
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
