# Use Node.js as the base image
FROM node:20-alpine

# Install system dependencies (for DB backup/restore)
RUN apk add --no-cache postgresql-client gzip

# Set working directory
WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm install

# Copy shared prisma folder
COPY prisma ./prisma

# Copy the server folder
COPY server ./server

# Copy data files for seeding
COPY ["TESTING COURT EXCEL FILE", "./TESTING COURT EXCEL FILE"]
COPY Disrtrict_PS.csv ./
COPY Police_Stations_Haryana.xlsx ./

# Build the frontend
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

# Generate Prisma client
RUN npx prisma generate

# Expose the API port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
