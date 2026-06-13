# MERN Task Manager

A simple local single-user task manager built with MongoDB, Express, React, and Node.js.

## Features

- Create, list, update, complete, and delete tasks
- Required task fields: title, description, due date, category, completion flag
- Due dates cannot be in the past
- Filter tasks by category and completion status
- Responsive card/table-like task layout
- Express REST API with Mongoose validations and HTTP error handling

## Requirements

- Node.js 18+
- MongoDB running locally or a MongoDB connection string

## Setup

```bash
npm run install:all
```

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

Update `MONGO_URI` if needed.

## Run

```bash
npm run dev
```

- API: `http://localhost:5000/tasks`
- React app: `http://localhost:5173`

## API Routes

- `GET /tasks` - list tasks
- `POST /tasks` - create task
- `PUT /tasks/:id` - update task details or completion status
- `DELETE /tasks/:id` - delete task
