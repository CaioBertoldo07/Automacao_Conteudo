from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma

from app.config.settings import settings
from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = Prisma()
    await db.connect()
    app.state.db = db
    yield
    await db.disconnect()


app = FastAPI(
    title="AutoConteúdo API",
    description="SaaS de automação de conteúdo para Instagram com IA",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
