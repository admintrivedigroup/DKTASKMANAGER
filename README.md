# Task Manager Platform

Task Manager Platform is a full-stack application that combines a Node.js/Express API with a React + Vite frontend for managing users, tasks, notices, and reports. The backend offers authentication, admin utilities, file uploads, and email support, while the frontend provides the dashboards and task workflows that consume those APIs.

## Project Structure

```
.
├── backend/                # Express API, MongoDB models, controllers, and utilities
├── frontend/Task-Manager/   # React frontend bootstrapped with Vite
└── vercel.json              # Deployment configuration
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (bundled with Node.js)
- A MongoDB database (local or hosted, e.g., MongoDB Atlas)

## Environment Variables

Create a `.env` file inside the `backend/` directory with the following keys:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<your_jwt_secret>
CLIENT_URL=http://localhost:5173

# Optional admin and email helpers
ADMIN_INVITE_TOKEN=<token_used_for_admin_invites>
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASS=<email_password>
EMAIL_FROM="Task Manager <no-reply@example.com>"
ADMIN_NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com
```

- `ADMIN_INVITE_TOKEN` is required for protected admin-only flows.
- Set `ADMIN_NOTIFICATION_EMAILS` (comma-separated) to automatically copy admin recipients on task assignment and reminder
  emails.

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:5000` by default. Routes are namespaced under `/api` (for example, `/api/auth`, `/api/tasks`, `/api/users`, `/api/reports`, and `/api/notices`). Uploaded assets are served from `/uploads`.

## Frontend Setup

```bash
cd frontend/Task-Manager
npm install
npm run dev
```

The Vite development server defaults to `http://localhost:5173` and consumes the backend API. Update `CLIENT_URL` in the backend `.env` if you expose the frontend from a different origin to satisfy CORS.

## Testing the MongoDB Connection (optional)

The backend includes a utility script to validate your MongoDB credentials:

```bash
cd backend
node test-mongo.js
```

## Building for Production

- **Backend:** Deploy the Express server to your preferred Node.js hosting environment. Ensure the environment variables above are provided.
- **Frontend:** Run `npm run build` inside `frontend/Task-Manager/` and host the generated static assets from the `dist/` folder on any static site host (or configure Vite preview with `npm run preview`).

## Useful npm Scripts

| Location | Command | Description |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start the Express API with Nodemon for live reloads. |
| `backend/` | `npm start` | Start the Express API without Nodemon. |
| `frontend/Task-Manager/` | `npm run dev` | Start the Vite dev server. |
| `frontend/Task-Manager/` | `npm run build` | Create a production build of the React app. |
| `frontend/Task-Manager/` | `npm run preview` | Preview the production build locally. |
| `frontend/Task-Manager/` | `npm run lint` | Run ESLint checks against the frontend codebase. |

## Contributing

1. Fork the repository and create a feature branch.
2. Run the backend and frontend locally to verify your changes.
3. Ensure linting/tests pass before opening a pull request.
4. Provide clear descriptions of your changes in commits and PRs.

## License

This project is provided as-is without an explicit license. Check with the maintainers before using it in production environments.
