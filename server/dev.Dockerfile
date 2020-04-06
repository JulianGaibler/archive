FROM node:13
ENV NODE_ENV=development

# Create app directory
RUN mkdir -p /server
WORKDIR /server

# Check libtool installation
RUN apt-get install libtool

# Install dependencies
COPY ./package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Exports (not used if docker network in host mode)
EXPOSE 4000
CMD [ "npm", "run", "dockerized" ]
