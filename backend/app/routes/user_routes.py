from fastapi import APIRouter, Depends, Request

from app.schemas.user_schema import UserResponse, UserUpdate
from app.services.user_service import get_user_by_id, update_user
from app.utils.dependencies import get_current_user_id

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    db = request.app.state.db
    user = await get_user_by_id(db, user_id)
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    db = request.app.state.db
    return await update_user(db, user_id, body)
