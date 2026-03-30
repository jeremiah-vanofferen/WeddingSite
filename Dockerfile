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

# Start development server (can be changed to serve static files in production)
CMD ["npm", "run", "dev", "--", "--host"]
