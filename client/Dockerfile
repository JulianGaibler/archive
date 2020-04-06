# build environment
FROM node:12.2.0-alpine as build
RUN apk add --no-cache git

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN npm install --silent
RUN npm install @vue/cli@3.7.0 -g
COPY . /app
RUN npm run build

# production environment: serving static files with NGINX
FROM nginx:1.16.0-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy NGINX configuration
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]