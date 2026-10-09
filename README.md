# myai

A full-stack AI chat and study-planning workspace built for students. Ask questions in a streamed AI conversation, organize small daily tasks, check in on study habits, and plan sessions across the week.

## Features

- **Streaming AI chat:** responses appear as they are generated, with Markdown rendering, copy controls, and stop generation.
- **Study dashboard:** add, complete, and remove to-dos; track daily study habits; create and remove subject-based sessions in a weekly timetable.
- **No account required:** conversations, preferences, tasks, habits, and timetable entries are stored in this browser using local storage.
- **Server-side AI credentials:** the Google Gemini API key is read by the backend and is never included in the frontend bundle.
- **Validated API:** Express routes validate chat input and expose a health endpoint.
- **Responsive interface:** works across desktop and mobile layouts.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide
- Backend: Node.js, Express, TypeScript
- AI: Google Gemini through the Vercel AI SDK
- Validation: Zod

## Architecture

```text
Browser (React)
  ├── Chat and study planner state saved in localStorage
  └── POST /api/chat
        ↓ streamed response
Express API (port 3001)
  ├── validates requests
  └── calls Google Gemini with the server-side API key
```

Chat prompts are sent to Google Gemini through the backend. Local storage is specific to this browser and is not synced or backed up. Avoid entering sensitive personal information. Clearing this browser's site data removes locally saved conversations and planner data.

## Project Structure

```text
chatbot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── styles.css
│   └── package.json
├── package.json
└── README.md
```

## Run Locally

Prerequisites: Node.js 20 or newer and a Google Gemini API key.

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create the backend environment file. In PowerShell:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

   On macOS or Linux:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Set your Gemini key in `backend/.env`:

   ```env
   AI_API_KEY=your_google_api_key_here
   AI_MODEL=gemini-3.8-flash
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend and frontend together:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173).

Keep `backend/.env` private. The root and backend ignore rules exclude local environment files from Git.

## Build

```bash
npm run build
```

This builds the backend TypeScript and creates the frontend production bundle.

## Resume Highlights

- Built a full-stack application with clear frontend and backend boundaries.
- Integrated a generative AI provider behind a server-side API, keeping credentials out of the browser.
- Implemented streamed responses, request validation, abort handling, and user-facing error states.
- Created a persistent student productivity dashboard with task management, daily habit tracking, and a weekly study timetable.
- Delivered responsive React interfaces with TypeScript and reusable UI components.
