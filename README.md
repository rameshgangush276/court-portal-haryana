# Court Portal Haryana - Installation Guide

This guide describes how to install and run the Court Portal on a new machine or Virtual Machine (VM).

## Prerequisites

Before starting, ensure the machine has the following installed:
1.  **Node.js** (v18 or higher)
2.  **npm** (usually comes with Node.js)
3.  **PostgreSQL** (Active and running)
4.  **Git**

---

## 🚀 Installation Steps

### 1. Clone the Repository
Open a terminal and run:
```bash
git clone https://github.com/jimmysh2/court-portal-haryana.git
cd court-portal-haryana
```

### 2. Install Dependencies
You need to install packages for both the backend and the frontend:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```bash
touch .env
```
Open `.env` and add the following configuration:
```env
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/court_portal?schema=public"
JWT_SECRET="generate-a-random-secret-string"
JWT_REFRESH_SECRET="generate-another-random-secret-string"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```
*Note: Replace `YOUR_DB_USER` and `YOUR_DB_PASSWORD` with your local PostgreSQL credentials.*

### 4. Database Setup
Initialize the database schema and seed the initial data:
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Seed the database with production data (Courts, Districts, etc.)
node prisma/seed-production.js
```

### 5. Run the Application

#### Option A: Development Mode (Hot Reload)
Run the backend and frontend simultaneously:
```bash
npm run dev
```
-   **Backend**: http://localhost:3000
-   **Frontend**: http://localhost:5173

#### Option B: Production Mode
Build the frontend and serve it via the backend:
```bash
# Build the frontend
cd client
npm run build
cd ..

# Start the server
NODE_ENV=production npm start
```
The app will be available at http://localhost:3000

---

## 🔑 Default Credentials
After seeding, you can log in with:
-   **Developer**: `developer` / `admin123`
-   **State Admin**: `state_admin` / `state123`
-   **District Admin**: Check `prisma/seed-production.js` for generated usernames per district.
-   **Naib Court**: Check `prisma/seed-production.js` for generated usernames.
