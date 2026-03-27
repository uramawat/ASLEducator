FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Bind to 0.0.0.0 to expose the dev server outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
