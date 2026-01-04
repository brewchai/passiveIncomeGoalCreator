---
description: How to run the project locally for development
---

# Local Development Setup

## Quick Start

Run the startup script from the project root:

```bash
// turbo
chmod +x start-local.sh && ./start-local.sh
```

This will start both the backend and frontend servers.

## Manual Setup

### 1. Start Backend

```bash
cd backend
source venv/bin/activate  # or .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on http://localhost:5001

### 2. Start Frontend

```bash
cd frontend
python dev-server.py
```

Frontend runs on http://localhost:3000

## URLs

| Page | Local URL |
|------|-----------|
| Home | http://localhost:3000 |
| Blog | http://localhost:3000/blog |
| About | http://localhost:3000/about |
| Privacy | http://localhost:3000/privacy |
| Terms | http://localhost:3000/terms |
| Contact | http://localhost:3000/contact |

## Troubleshooting

### Port already in use

Kill the process using the port:

```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### Backend not connecting

Make sure you have a `.env` file in the backend directory with:
- `FMP_API_KEY` - For stock dividend data
- `OPENAI_API_KEY` - For AI chat features

### Supabase issues

The app uses Supabase for auth/data. Make sure you have internet access.
</CodeContent>
<parameter name="Complexity">2
