# alpine images for small container size
# build server application with transpiling
FROM node:lts-alpine as build-server-stage

# install dependencies to be able to build the needed binaries
RUN apk add build-base
RUN apk add make
RUN apk add libtool
RUN apk add autoconf
RUN apk add automake
RUN apk add python3

COPY ./package*.json ./
RUN npm install
COPY ./ ./
RUN npm run build

# create Docker image for production use
FROM node:lts-alpine as production-stage
WORKDIR /usr/src/app
ENV PORT 80
COPY --from=build-server-stage dist/ ./dist
COPY --from=build-server-stage knexfile.js ./knexfile.js
COPY --from=build-server-stage node_modules/ ./node_modules/
EXPOSE 80
CMD ["node", "dist/index.js"]