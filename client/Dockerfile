# Build environment
FROM node:16 as build

WORKDIR /usr/src/app
# Install dependencies
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY ./ ./
RUN npm ci
RUN npm install @vue/cli@3.7.0 -g
# Build source
RUN npm run build

# Production environment: serving static files with NGINX
FROM nginx:1.16.0-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# copy NGINX configuration
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]