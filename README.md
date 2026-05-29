# SuriSync Frontend

The modern, responsive user interface for the SuriSync workplace management portal. 

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS, Framer Motion
- **State Management:** Zustand (`auth-store`)
- **API Client:** Axios
- **Components:** Radix UI / Shadcn UI

## Features
- **Dashboard:** At-a-glance metrics and broadcasted announcements.
- **Tasks Board:** Drag-and-drop Kanban board with dynamic assignee initials and priority tagging.
- **Room Reservations:** Modal-driven workflow to book meeting spaces, complete with safe loading states.
- **Documents Hub:** Browse, create folders, and upload files directly to the backend.
- **Responsive Layout:** A glassmorphic sidebar that pins to the left on desktop and transitions into an off-canvas hamburger menu on mobile devices.

## Local Development

### Requirements
- Node.js 18+
- npm or pnpm

### Setup
1. Navigate to the frontend directory: `cd SuriSync_Frontend`
2. Install dependencies: `npm install`
3. Configure your backend URL in `.env` (defaults to `http://127.0.0.1:8000/api/v1` locally).
4. Start the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser.
