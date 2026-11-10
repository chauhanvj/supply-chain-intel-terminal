from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from contextlib import asynccontextmanager

from app.database import init_db, get_db
from app.routers import events, commodities, components, policies, industries, analytics, map as map_router, alerts, sources, indian_stocks, order_pipeline, articles

BASE_DIR = Path(__file__).resolve().parent.parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is initialized
    init_db()
    # Check if events table has data; if empty, run seed
    conn = get_db()
    cursor = conn.cursor()
    cnt = cursor.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    order_cnt = cursor.execute("SELECT COUNT(*) FROM order_book_companies").fetchone()[0]
    art_cnt = cursor.execute("SELECT COUNT(*) FROM supply_shortage_articles").fetchone()[0]
    conn.close()
    if cnt == 0:
        from app.seed_data import seed_database
        seed_database()
    if order_cnt == 0:
        from app.seed_order_pipeline import seed_order_pipeline_db
        seed_order_pipeline_db()
    if art_cnt == 0:
        from app.seed_articles import seed_shortage_articles_db
        seed_shortage_articles_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="Global Supply Chain & Commodity Early Warning Intelligence Dashboard",
    description="Production-quality early-warning intelligence system for tracking disruptions, commodity price pressures, lead-time expansions, and downstream impacts.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_frame_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "frame-ancestors *"
    response.headers["X-Frame-Options"] = "ALLOWALL"
    return response

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "app", "templates"))

# Include API routers
app.include_router(events.router)
app.include_router(commodities.router)
app.include_router(components.router)
app.include_router(policies.router)
app.include_router(industries.router)
app.include_router(analytics.router)
app.include_router(map_router.router)
app.include_router(alerts.router)
app.include_router(sources.router)
app.include_router(indian_stocks.router)
app.include_router(order_pipeline.router)
app.include_router(articles.router)

@app.get("/healthz")
def healthcheck():
    return {"status": "healthy", "service": "Global Supply Chain Intelligence Terminal"}

@app.get("/")
@app.get("/dashboard")
def render_terminal(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host=host, port=port)
