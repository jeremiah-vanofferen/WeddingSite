# Use official Node.js 22 Alpine image as base
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy only files required for the frontend build/runtime
COPY index.html ./
COPY vite.config.js ./
COPY src ./src
COPY public ./public

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start development server with configurable bind host/port
CMD ["sh", "-c", "npm run dev -- --host ${VITE_BIND_HOST:-0.0.0.0} --port ${VITE_BIND_PORT:-3000}"]
