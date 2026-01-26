# Build Stage
FROM node:lts AS builder

WORKDIR /app

# Copy package files
# Copy package files
COPY package*.json ./

# Define build arguments
ARG EXPO_PUBLIC_API_BASE_URL
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the web application
# This assumes "dist" is the output directory configured in app.json (web.output: "static")
RUN npx expo export --platform web

# Production Stage
FROM nginx:stable-alpine AS runner

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
# Standard Expo web export output is "dist" for static
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 180
EXPOSE 180

CMD ["nginx", "-g", "daemon off;"]
