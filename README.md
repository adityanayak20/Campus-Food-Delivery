## BITS & BITES - Campus Food Delivery System

A full-stack web application for campus food delivery service, built with Node.js, Express.js, and Postgres (via Docker). This system allows students to order food from campus outlets, delivery personnel to manage deliveries, and administrators to manage menu items and track orders.

### Dockerized Architecture

- **Frontend**: Static HTML/CSS/JS under `frontend/` served by the backend
- **Backend**: Node.js/Express (`backend/server.js`) running in a Docker container
- **Database**: Postgres 16 running in a separate Docker container, initialized from `database/init.sql`

### Running with Docker Compose

From the project root (`Campus Food Delivery`), run:

```bash
./run.sh
```

This will:

- Build the backend image from the local `Dockerfile`
- Start a Postgres container with schema + seed data from `database/init.sql`
- Start the backend container, wired to Postgres via environment variables

Backend will be available at:

- `http://localhost:3000`

The backend serves:

- Static frontend files (HTML/CSS/JS) from the project directory
- REST API under `/api/...`

#### Step-by-step (Docker) – backend + frontend + database

1. Open a terminal.
2. Go to the project directory:

   ```bash
   cd "/Users/adityanayak/Desktop/DBMS PROJECT/Campus Food Delivery"
   ```

3. Make sure `run.sh` is executable (only once):

   ```bash
   chmod +x run.sh
   ```

4. Start the full stack:

   ```bash
   ./run.sh
   ```

   This will:
   - Stop and remove any old containers for this project.
   - Build the backend Docker image.
   - Start the `postgres` container and initialize it using `database/init.sql`.
   - Wait for Postgres to be healthy.
   - Start the `backend` container, which also serves the frontend.

5. Open your browser and go to:

   ```text
   http://localhost:3000
   ```

   - This loads `frontend/index.html` (login/signup page).
   - All other pages (dropdown, RC menu, admin, delivery dashboard) are linked from there.

#### Running individual services with Docker

From the same project root:

- **Database only (Postgres)**:

  ```bash
  docker compose up postgres
  ```

- **Backend + frontend (requires Postgres running or will wait for it)**:

  ```bash
  docker compose up backend
  ```

- **Everything in the background**:

  ```bash
  docker compose up -d
  ```

### Database Configuration (inside Docker)

- **Host (from backend)**: `postgres`
- **Port**: `5432`
- **Database**: `campus_food_delivery`
- **User**: `campus_user`
- **Password**: `campus_pass`

These are configured in `docker-compose.yml` and read by `server.js` via:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Local Development without Docker

1. Install dependencies:

```bash
npm install
```

2. Run a Postgres instance locally and initialize it with `database/init.sql`, or adjust the `DB_*` environment variables for your own database:

   ```bash
   psql -U campus_user -d postgres -f database/init.sql
   ```

   (Adjust user/DB/command based on your local setup.)

3. Install backend dependencies and start the server:

   ```bash
   cd backend
   npm install
   DB_HOST=localhost DB_PORT=5432 DB_USER=campus_user DB_PASSWORD=campus_pass DB_NAME=campus_food_delivery npm start
   ```

4. Open `http://localhost:3000` in your browser.

