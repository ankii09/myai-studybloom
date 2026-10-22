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
- AI: Gemini Interactions API through Google's Gen AI SDK
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

This builds the backend TypeScript and creates the frontend production bundle. The root `npm run build` builds only the backend, which is what Render should run from the repository root.

## Deploy on Vercel (recommended)

Vercel hosts the React app and the `/api/chat` function from one project. Do not set the Root Directory to `frontend` — leave it as the repository root.

1. Push this repo to GitHub if it is not already there.
2. Open [vercel.com](https://vercel.com), sign in with GitHub, and click **Add New → Project**.
3. Import this repository.
4. Confirm the project settings:
   - **Root Directory:** leave empty (repository root)
   - **Framework Preset:** Other
   - **Build Command:** `npm run build && npm run build --workspace frontend`
   - **Output Directory:** `frontend/dist`
   - **Install Command:** `npm install`
   - **Node.js Version:** 22
5. Open **Environment Variables** before the first deploy and add:

   | Name | Value |
   | --- | --- |
   | `AI_API_KEY` | your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
   | `AI_MODEL` | `gemini-3.8-flash` |
   | `FRONTEND_URL` | your Vercel URL, for example `https://your-app.vercel.app` |

   Do **not** set `VITE_API_BASE_URL`. The site calls `/api/chat` on the same Vercel domain.
6. Click **Deploy**.
7. After it finishes, open `https://YOUR-APP.vercel.app/api/health`. You should see `{"status":"ok","service":"ai-backend"}`.
8. Open the site URL, send a message, and confirm a full reply streams in.
9. If you use a custom domain later, add that origin as `FRONTEND_URL` and redeploy.

Common Vercel mistakes:

- Missing `AI_API_KEY` — chat will fail with a missing-key error.
- Root Directory set to `frontend` — `/api/chat` will not deploy.
- Setting `VITE_API_BASE_URL` to localhost or an old Render URL — the browser will call the wrong backend.

## Deploy with GitHub Pages and Render

The frontend can also be deployed to GitHub Pages with the Express API on Render. The repository includes a GitHub Actions workflow and a Render Blueprint (`render.yaml`).

### 1. Deploy the backend to Render

1. In Render, open the existing web service (or choose **New → Blueprint** and apply `render.yaml`).
2. Set **Root Directory** to empty / repository root. Do not use `backend`. This repo is an npm workspace, so install and start must run at the root.
3. Set **Build Command** to `npm ci && npm run build` and **Start Command** to `npm start`.
4. Set Node to 22, or add a `NODE_VERSION=22` environment variable.
5. Set `AI_API_KEY` to your Google Gemini API key. Also set `AI_MODEL=gemini-3.8-flash` and `FRONTEND_URL=https://ankii09.github.io` if they are not already present.
6. Wait for the service to deploy. Verify `https://YOUR-RENDER-SERVICE.onrender.com/api/health` returns `{"status":"ok","service":"ai-backend"}`.

### 2. Deploy the frontend to GitHub Pages

1. In the GitHub repository, open **Settings → Actions → General** and make sure Actions are enabled.
2. In **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
3. Optionally add a repository variable named `VITE_API_BASE_URL` with the full Render service origin, for example `https://myai-studybloom-api.onrender.com`. If it is unset, the workflow uses that Render URL by default.
4. Push to `main`, or manually run **Deploy frontend to GitHub Pages** from the Actions tab. The deployed site URL is `https://ankii09.github.io/myai-studybloom/`.

Never put `AI_API_KEY` in GitHub Pages or frontend variables; keep it only in Render's environment settings. GitHub Pages serves the frontend statically and cannot host the Express backend.
