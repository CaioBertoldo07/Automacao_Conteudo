from fastapi import APIRouter, Request

from app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import login, register

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_endpoint(body: RegisterRequest, request: Request):
    db = request.app.state.db
    return await register(db, body)


@router.post("/login", response_model=TokenResponse)
async def login_endpoint(body: LoginRequest, request: Request):
    db = request.app.state.db
    return await login(db, body)
