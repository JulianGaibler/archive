# build server application with transpiling
FROM node as build-server-stage

COPY ./package*.json ./
RUN npm install
COPY ./ ./
RUN npm run build

# create Docker image for production use
FROM node:lts-alpine as production-stage
WORKDIR /usr/src/app
ENV PORT 80
COPY --from=build-server-stage dist/ ./
COPY --from=build-server-stage node_modules/ ./node_modules/
EXPOSE 80
CMD ["node", "index.js"]