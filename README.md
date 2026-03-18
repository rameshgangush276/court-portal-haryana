# Court Portal Haryana - Installation Guide

This guide describes how to install and run the Court Portal on a new machine or Virtual Machine (VM).

---

## 🐳 Option 1: One-Click Install (Using Docker)
This is the easiest and most recommended method. It sets up the database, backend, and frontend automatically.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running.

1.  **Clone and Start**:
    ```bash
    git clone https://github.com/jimmysh2/court-portal-haryana.git
    cd court-portal-haryana
    docker-compose up --build -d
    ```
2.  **Initialize Database (First time only)**:
    ```bash
    docker-compose exec app npx prisma migrate deploy
    docker-compose exec app node prisma/seed-production.js
    ```
3.  **Access App**: Open http://localhost:3000

---

## 🛠️ Option 2: Manual Installation
Use this if you prefer to run the components separately without Docker.

### Prerequisites (for manual install)
Before starting, ensure the machine has the following installed:
1.  **Node.js** (v20 or higher)
2.  **npm** (usually comes with Node.js)
3.  **PostgreSQL** (Active and running)
4.  **Git**

### 1. Clone the Repository (Manual)
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

## 🔄 Maintenance & Synchronization (CRITICAL)

If you make any changes via the UI (e.g., adding **New Police Stations** or creating **New Data Entry Tables**), these changes exist only in your local database. To ensure they are saved to GitHub and propagated to other deployments (like Docker or Production):

1.  **Run the Sync Script**:
    ```bash
    npm run db:sync
    ```
    This will automatically update `prisma/seed-production.js` and `Disrtrict_PS.csv` with your latest database changes.

2.  **Commit and Push**:
    ```bash
    git add .
    git commit -m "Sync UI changes to code"
    git push
    ```

> [!IMPORTANT]
> **Antigravity Rule**: Always run `npm run db:sync` before any `git commit` to ensure the repository remains the single source of truth.
