# Task Manager Full Stack Integration

This project connects a React frontend to a Node/Express/MongoDB backend.

## Features

- View tasks from MongoDB
- Create tasks from the React UI
- Update existing tasks
- Delete tasks with confirmation
- Loading and error handling for API requests
- Success and failure toast notifications

## Project Structure

- `Backend/` - Express API and MongoDB connection
- `Frontend/` - React app built with Vite

## Requirements

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB Atlas connection string

## Backend Setup

1. Open a terminal in the `Backend` folder.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in `Backend/` with:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

4. Start the backend:

```bash
npm run dev
```

The API will run on `http://localhost:3000`.

## Frontend Setup

1. Open a second terminal in `Frontend/Task-Manager-Api`.
2. Install dependencies:

```bash
npm install
```

3. Start the Vite dev server:

```bash
npm run dev
```

The app will run on `http://localhost:5173`.

## Run the Full Stack with Docker Compose

From the repository root, build and start the frontend, backend, and MongoDB:

```bash
docker compose up --build
```

Open `http://localhost:5173`. The frontend's Nginx server forwards `/api` requests to the backend service, and MongoDB data is stored in the `mongo-data` named volume. Stop the stack with `Ctrl+C`; use `docker compose down` to remove the containers while keeping the database volume.

## API Flow

- The React app calls `GET /tasks` on load.
- Creating a task sends `POST /tasks`.
- Editing a task sends `PUT /tasks/:id`.
- Deleting a task sends `DELETE /tasks/:id`.
- After each write, the UI re-fetches the task list to stay in sync with MongoDB.

## Notes

- The frontend uses a Vite proxy for `/api` requests, so it can talk to the backend without hardcoding the backend URL in multiple places.
- Delete actions show a browser confirmation dialog before proceeding.
- Success and error actions are shown with toast messages.

