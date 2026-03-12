# Hotel Management System — Backend API

REST API for Hotel Management System built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (running locally)
- pgAdmin (to run SQL setup)
- VS Code with Thunder Client extension (for testing)

## Project Structure
```
backend/
├── node_modules/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── guests.controller.js
│   │   ├── invoices.controller.js
│   │   ├── reservations.controller.js
│   │   └── rooms.controller.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rbac.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── guests.routes.js
│   │   ├── invoices.routes.js
│   │   ├── reservations.routes.js
│   │   └── rooms.routes.js
│   └── app.js
├── .env
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
└── swagger.yaml
```

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of the backend folder:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=grand_plaza_super_secret_jwt_key_2026
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

Replace `your_password` with your PostgreSQL password.

### 4. Set Up the Database

Open pgAdmin and run the following SQL files in order using the Query Tool:

1. `schema.sql` — creates all tables, triggers, indexes, and views
2. `seed.sql` — inserts sample data

### 5. Fix Seed Data Passwords

The seed data contains placeholder password hashes. Run this SQL once in pgAdmin before testing login:
```sql
UPDATE users
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE username IN ('admin', 'mgr_nyc', 'rec_nyc1', 'hk_nyc1');
```

This sets the password to `password` for the four main test accounts.

### 6. Start the Server
```bash
npm run dev
```

You should see:
```
🚀 Server running at http://localhost:3000/api/v1
✅ Database connected successfully
```

## Testing the API

Install the Thunder Client extension in VS Code. Then:

**Step 1 — Health check:**
```
GET http://localhost:3000/api/v1/health
```

**Step 2 — Login:**
```
POST http://localhost:3000/api/v1/auth/login
Body (JSON):
{
  "username": "admin",
  "password": "password"
}
```

Copy the token from the response.

**Step 3 — Set Authorization header:**

In Thunder Client, go to the Auth tab, select Bearer, and paste your token. Do this for every protected request.

## Test Accounts

| Username | Password | Role |
|---|---|---|
| admin | password | Admin |
| mgr_nyc | password | Manager |
| rec_nyc1 | password | Receptionist |
| hk_nyc1 | password | Housekeeping |

## API Documentation

Full API specification is available in `swagger.yaml`. To view it rendered:

1. Go to https://editor.swagger.io
2. Paste the contents of `swagger.yaml` into the left panel

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (auto-restart on changes) |
| `npm start` | Start server without nodemon |