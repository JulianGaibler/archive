# alpine images for small container size
FROM node:lts-alpine as build-server-stage

# install dependencies to be able to build the needed binaries
RUN apk add build-base
RUN apk add make
RUN apk add libtool
RUN apk add autoconf
RUN apk add automake
RUN apk add python3

# build server application with transpiling
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

# for the migrations
COPY ./package*.json ./
COPY ./db/migrations/ ./db/migrations

# run the thing
EXPOSE 80
CMD ["npm", "run", "production"]