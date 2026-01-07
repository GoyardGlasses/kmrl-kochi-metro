FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_BASE_URL=http://localhost:3000/api
ARG VITE_ENABLE_MOCK_API=false

# Set as environment variables for Vite build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ENABLE_MOCK_API=$VITE_ENABLE_MOCK_API

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
