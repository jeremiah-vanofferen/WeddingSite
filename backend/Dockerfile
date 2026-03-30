# Backend Dockerfile for Node.js API
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend runtime source
COPY server.js ./server.js

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
