import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend directory is in Python path whether run from root or backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.services.demo_service import seed_equipment_types, seed_demonstration_project
from app.routers import projects, drawings, walls, equipment, vertical_config, controls, demo

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed standard equipment & demo project
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_equipment_types(session)
        # Pre-seed demo project so it is immediately available on first run
        await seed_demonstration_project(session)
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description="Engineering-grade 3D HVAC floorplan reconstruction and equipment placement platform."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(projects.router, prefix=settings.API_PREFIX)
app.include_router(drawings.router, prefix=settings.API_PREFIX)
app.include_router(walls.router, prefix=settings.API_PREFIX)
app.include_router(equipment.router, prefix=settings.API_PREFIX)
app.include_router(vertical_config.router, prefix=settings.API_PREFIX)
app.include_router(controls.router, prefix=settings.API_PREFIX)
app.include_router(demo.router, prefix=settings.API_PREFIX)

# Static file serving for uploads/previews
app.mount("/uploads", StaticFiles(directory=str(settings.STORAGE_DIR)), name="uploads")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
