# Backend Dockerfile for Node.js API
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
