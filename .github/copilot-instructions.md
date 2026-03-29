# Copilot Instructions

This workspace contains a React.js application with Docker support for Ubuntu 24.04.

## Project Type
- **Framework**: React.js with Vite
- **Container**: Docker with Ubuntu 24.04
- **Runtime**: Node.js 20.x

## Quick Start with Docker

Build and run the application:
```bash
docker build -t wedding-app .
docker run -p 3000:3000 wedding-app
```

Or use Docker Compose:
```bash
docker-compose up
```

## Local Development (Requires Node.js 20.x)

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

## Project Structure
- `Dockerfile` - Ubuntu 24.04 with Node.js 20.x
- `docker-compose.yml` - Multi-container orchestration
- `vite.config.js` - Vite build tool configuration
- `src/` - React components and styles
- `package.json` - Dependencies (React 18, Vite, ESBuild)

## Customization Guidelines
- Modify `Dockerfile` for custom Node.js version or Ubuntu configuration
- Update `docker-compose.yml` for multi-container setup
- Edit `package.json` for additional dependencies
- Configure environment variables in `.env` file
