# ChurnAI Pro v1 — Next.js + FastAPI

Telco churn prediction platform rebuilt from Streamlit to Next.js for Vercel deployment.
Maintains full compatibility with existing `src/` Python codebase.

## Architecture

```
Frontend (Next.js → Vercel)
  pages/          → Route pages
  components/     → Layout, UI components
  lib/            → API client, analytics
  styles/         → Global CSS + design tokens

Backend (FastAPI → Railway/Render)
  backend/app.py  → Drop-in replacement for Streamlit app.py
  src/            → Unchanged — processor, model, business_impact
  models/         → Trained model .pkl files
  data/           → CSV datasets
```

## Quick Start

### Frontend
```bash
cd telco-churn-app   # (root of this project)
npm install
cp .env.example .env.local
npm run dev          # → http://localhost:3000
```

### Backend
```bash
# From your project root (where src/ lives)
pip install -r backend/requirements.txt
cp backend/app.py app_fastapi.py   # Keep original app.py (Streamlit)
uvicorn app_fastapi:app --reload --port 8000
```

## Deploying to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Set env variable: `NEXT_PUBLIC_API_URL=https://your-api.railway.app`
4. Deploy ✓

## Deploying Backend to Railway

1. Push the project root (with `backend/app.py` copied to `app.py`)
2. Set start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
3. Copy Railway URL → set as `NEXT_PUBLIC_API_URL` in Vercel

## Pages

| Route         | Description                              |
|---------------|------------------------------------------|
| `/`           | Dashboard overview with charts           |
| `/predict`    | Single + batch prediction (CSV upload)   |
| `/insights`   | SHAP force plots + LIME explanations     |
| `/consultant` | AI chat powered by Mistral (free)        |
| `/roi`        | Business ROI & revenue impact calculator |
| `/train`      | Retrain model with custom dataset        |
| `/stats`      | App usage statistics (localStorage)     |

## AI Consultant

Uses **Pollinations.ai** — completely free, no API key required.
Model: Mistral 7B · Context: Telecom churn analytics expert

## Design System

- **Theme**: Dark navy glassmorphism with cyan accent
- **Fonts**: Syne (display) + DM Sans (body) + JetBrains Mono (code)  
- **Colors**: `--cyan: #06B6D4` · `--bg-base: #040812`
- **Mobile**: Fully responsive with collapsible sidebar
