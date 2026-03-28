from fastapi import HTTPException, status
from prisma import Prisma

from app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user_schema import UserResponse
from app.services.user_service import create_user, get_user_by_email
from app.utils.security import create_access_token, verify_password


async def register(db: Prisma, data: RegisterRequest) -> TokenResponse:
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado.",
        )

    user = await create_user(db, data)
    token = create_access_token({"sub": user.id})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            isActive=user.isActive,
            createdAt=user.createdAt,
        ),
    )


async def login(db: Prisma, data: LoginRequest) -> TokenResponse:
    user = await get_user_by_email(db, data.email)

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        )

    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada.",
        )

    token = create_access_token({"sub": user.id})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            isActive=user.isActive,
            createdAt=user.createdAt,
        ),
    )
