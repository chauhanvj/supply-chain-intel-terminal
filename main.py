"""
Root application entry point / compatibility shim for Cloud Platforms (Render, Railway, Fly.io, Heroku, Docker).
Supports both:
  1. uvicorn main:app --host 0.0.0.0 --port $PORT
  2. uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys
from pathlib import Path

# Ensure the root project directory is in sys.path so 'app' package resolves cleanly
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import the FastAPI application instance
from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
