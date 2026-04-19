# ChurnAI Pro v1 - Next.js + Vercel Python

Telco churn prediction platform rebuilt from Streamlit to Next.js for Vercel deployment.
It keeps the existing `src/` processing logic and now ships a built-in Python backend for Vercel under `api/backend.py`.

## Architecture

```text
Frontend (Next.js -> Vercel)
  pages/          -> Route pages
  components/     -> Layout, UI components
  lib/            -> API client, analytics
  styles/         -> Global CSS + design tokens

Backend (Vercel Python Function)
  api/backend.py  -> FastAPI app served at /api/backend/*
  src/            -> Reused preprocessing helpers
  models/         -> Pretrained model artifacts deployed with the app
  data/           -> Optional datasets for offline retraining only
```

## Quick Start

### Frontend

```bash
npm install
npm run dev
```

### Optional local backend

Use this only if you want local development to hit a separate Python process on `http://localhost:8000`.

```bash
pip install -r backend/requirements.txt
uvicorn app_fastapi:app --reload --port 8000
```

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Leave `NEXT_PUBLIC_API_URL` unset if you want to use the built-in Python backend.
4. Deploy.

The frontend will call `/api/backend` automatically on Vercel.

## Serverless model strategy

- Prediction, batch scoring, explainability, metrics, ROI, and health run inside `api/backend.py`.
- Model loading is lazy and cached per warm function instance.
- Custom-data training now runs as an evaluation flow from the uploaded session CSV and returns model metrics plus confusion-matrix output to the UI.
- Session training is not persisted as a deployed model artifact. To replace the production model, retrain offline and redeploy refreshed files in `models/`.

## Pages

| Route | Description |
| --- | --- |
| `/` | Dashboard overview with charts |
| `/predict` | Single and batch prediction |
| `/insights` | Explainability insights |
| `/consultant` | AI consultant chat |
| `/roi` | Business ROI and retention impact calculator |
| `/train` | Training summary UI with serverless-safe fallback |
| `/stats` | App usage statistics |

## AI Consultant

The consultant now calls Groq through `pages/api/chat.js`. Configure `GROQ_API_KEY` and, if needed, `GROQ_ENDPOINT` in your Vercel project or local `.env.local`. You can also optionally override the default model with `GROQ_MODEL`. Backend or connection failures are filtered so end users only see a simple friendly support message.

## Design System

- Adaptive light and dark theme
- Mobile-first responsive layout with bottom navigation and a More modal
- Modern dashboard styling with expressive typography and layered surfaces
