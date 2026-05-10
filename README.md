# Team Task Manager

> A real-time team task and project management application built with React, Node.js, Express, MongoDB, and Socket.IO.

🌐 **Live Demo:** [https://team-task-manager-production-0909.up.railway.app](https://team-task-manager-production-0909.up.railway.app)

---

## Features

- **Project Management** — Create, archive, star, and track project delivery
- **Kanban Task Board** — Drag-and-drop tasks across Todo, In Progress, Review, and Completed
- **Real-time Sync** — Live updates across all connected users via Socket.IO
- **Team Collaboration** — Invite members to projects, assign roles (Member / Manager)
- **Activity Feed** — Full timeline of all team actions
- **Notifications** — In-app alerts for invitations, deadline changes, and assignments
- **Dashboard** — Personal workspace with charts, progress tracking, and today's work
- **Dark / Light Mode** — Persistent theme toggle
- **Mobile Responsive** — Full bottom navigation on mobile devices

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Recharts, GSAP, Tailwind CSS |
| Backend | Node.js, Express 5, Socket.IO |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (Access + Refresh tokens) |
| File Uploads | Cloudinary, Multer |
| Deployment | Railway |

## Screenshots

> Login page, Dashboard, Projects, Kanban Board — all accessible at the live demo link above.

## Project Structure

```
Team Task Manager/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API & socket clients
│   │   └── context/      # Theme context
│   └── dist/             # Built output
├── server/               # Node.js backend
│   └── src/
│       ├── controllers/  # Route handlers
│       ├── models/       # Mongoose schemas
│       ├── routes/       # Express routers
│       ├── middleware/   # Auth middleware
│       └── config/       # DB connection
├── nixpacks.toml         # Railway build config
└── railway.json          # Railway deploy config
```

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### 1. Clone the repository
```bash
git clone https://github.com/Bharath-Karingula/team-task-manager.git
cd team-task-manager
```

### 2. Setup the server
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### 3. Setup the client
```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Deployment

Deployed on **Railway** with automatic deployments on every push to `main`.

Every push to `main` → Railway auto-builds and deploys.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `CLIENT_URL` | Frontend URL (for CORS) |
| `NODE_ENV` | Set to `production` on Railway |

## License

MIT
