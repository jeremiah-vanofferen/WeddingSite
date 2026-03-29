# React.js App with Docker

A React.js application configured to run in Docker on Ubuntu 24.04 with Node.js 20.x.

## Features

- React 18 with Vite build tool
- Docker support for Ubuntu 24.04
- Node.js 20.x runtime
- Development and production builds
- Docker Compose configuration for easy deployment

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Or Node.js 20.x and npm for local development

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t wedding-app .

# Run the container
docker run -p 3000:3000 wedding-app
```

### Using Docker Compose

```bash
# Build and run the container
docker-compose up

# Stop the container
docker-compose down
```

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
.
├── Dockerfile              # Docker configuration for Ubuntu 24.04
├── docker-compose.yml      # Docker Compose setup
├── vite.config.js          # Vite configuration
├── package.json            # Project dependencies
├── index.html              # HTML entry point
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main App component
    ├── App.css             # App styles
    └── index.css           # Global styles
```

## Configuration

### Dockerfile
- Based on Ubuntu 24.04
- Installs Node.js 20.x from NodeSource repository
- Exposes port 3000
- Runs development server with host binding for container access

### Vite Configuration
- Development server runs on port 3000
- Bound to 0.0.0.0 for container access
- Production build output to `dist/` directory

## Environment Variables

- `NODE_ENV`: Set to production in container (can be overridden)

## Notes

- The application runs in development mode by default in the Docker container
- For production deployment, modify the Dockerfile to serve static files from `dist/` with a web server (nginx, etc.)
- Hot module replacement (HMR) works in development mode with the host binding
