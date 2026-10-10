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
npm run build:all
```

This builds the backend TypeScript and creates the frontend production bundle. The root `npm run build` builds only the backend, which is suitable for Render when its Root Directory is left at the repository root.

## Deploy with GitHub Pages and Render

The frontend is deployed to GitHub Pages and the Express API is deployed as a Render web service. The repository includes a GitHub Actions workflow and a Render Blueprint (`render.yaml`).

### 1. Deploy the backend to Render

1. In Render, choose **New → Blueprint**, then connect this GitHub repository and apply `render.yaml`.
2. Set the `AI_API_KEY` environment variable on the Render service to your Google Gemini API key. The blueprint sets `AI_MODEL` and the allowed GitHub Pages origin.
3. Wait for the service to deploy. Verify `https://YOUR-RENDER-SERVICE.onrender.com/api/health` returns `{"status":"ok","service":"ai-backend"}`.

### 2. Deploy the frontend to GitHub Pages

1. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
2. Add a repository variable named `VITE_API_BASE_URL` with the full Render service origin, for example `https://myai-studybloom-api.onrender.com` (no path required).
3. In **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
4. Push to `main`, or manually run **Deploy frontend to GitHub Pages** from the Actions tab. The deployed site URL is `https://ankii09.github.io/myai-studybloom/`.

The workflow expects `VITE_API_BASE_URL` and fails with a clear message if it is missing. It is a public API URL, not a secret. Never put `AI_API_KEY` in GitHub Pages or frontend variables; keep it only in Render's environment settings. GitHub Pages serves the frontend statically and cannot host the Express backend.
