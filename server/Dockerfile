# alpine images for small container size
FROM node:16-alpine as build-server-stage

# install dependencies to be able to build the needed binaries
RUN apk add build-base
RUN apk add make
RUN apk add libtool
RUN apk add autoconf
RUN apk add automake
RUN apk add python3

# build server application with transpiling
COPY ./ ./
# npm ci: https://docs.npmjs.com/cli/v7/commands/npm-ci
RUN npm ci
RUN npm run build

# create Docker image for production use
FROM node:16-alpine as production-stage
WORKDIR /usr/src/app
ENV PORT 4000
COPY --from=build-server-stage dist/ ./dist
COPY --from=build-server-stage knexfile.js ./knexfile.js
COPY --from=build-server-stage node_modules/ ./node_modules/

# for the migrations
COPY ./package*.json ./
COPY ./db/migrations/ ./db/migrations

# run the thing
EXPOSE 4000
CMD ["npm", "run", "production"]