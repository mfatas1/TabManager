# Folio

A full-stack link library for saving articles, generating concise AI summaries, organizing projects, and seeing how topics connect.

## Local Setup

1. Install backend dependencies:

```bash
pip install -r requirements.txt
```

2. Create a root `.env` file:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/tabmanager
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4.1-nano

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_JWT_AUDIENCE=authenticated
FRONTEND_ORIGINS=http://localhost:5173
```

3. Create `frontend/.env`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
```

4. Run the backend:

```bash
uvicorn backend.main:app --reload
```

5. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and the API runs at `http://localhost:8000`.

## Deploy

This repo is ready for a Vercel frontend, Render backend, and Supabase database/auth setup.

### 1. Deploy The Backend On Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repo. Render will use `render.yaml`.
3. Set the synced environment variables:

```bash
DATABASE_URL=your-supabase-postgres-connection-string
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

`OPENAI_MODEL` defaults to `gpt-4.1-nano` in `render.yaml`.

After deploy, your backend URL will look like:

```text
https://folio-api.onrender.com
```

### 2. Deploy The Frontend On Vercel

1. Import the same GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Add environment variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-render-backend.onrender.com
```

Vercel will build with `npm run build` and serve `dist`.

### 3. Update Supabase Auth URLs

In Supabase Auth settings, set:

```text
Site URL: https://your-vercel-app.vercel.app
Redirect URLs:
http://localhost:5173/**
https://your-vercel-app.vercel.app/**
```

### 4. Update Render CORS

Once Vercel gives you the final frontend URL, put that URL in Render's `FRONTEND_ORIGINS` env var:

```bash
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

For a custom domain, include both URLs separated by commas:

```bash
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app,https://www.yourdomain.com
```
