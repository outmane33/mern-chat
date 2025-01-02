FROM node:18-alpine
WORKDIR /app
COPY ../package*.json ./
COPY ../config.env ./
COPY . .
RUN npm install
EXPOSE 8000
CMD ["npm", "run", "start"]