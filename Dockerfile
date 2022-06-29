FROM node:alpine3.15

RUN apk add --update docker openrc
RUN rc-update add docker boot

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --save
# If you are building your code for production
# RUN npm install --only=production

COPY public public
COPY sample_config sample_config
COPY start.sh start.sh
COPY server.js .

RUN echo "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin" >> /etc/passwd

EXPOSE 80
CMD [ "/bin/sh", "start.sh"]