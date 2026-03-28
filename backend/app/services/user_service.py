from prisma import Prisma

from app.schemas.user_schema import UserCreate, UserUpdate
from app.utils.security import hash_password


async def get_user_by_id(db: Prisma, user_id: str):
    return await db.user.find_unique(where={"id": user_id})


async def get_user_by_email(db: Prisma, email: str):
    return await db.user.find_unique(where={"email": email})


async def create_user(db: Prisma, data: UserCreate):
    return await db.user.create(
        data={
            "email": data.email,
            "password": hash_password(data.password),
            "name": data.name,
        }
    )


async def update_user(db: Prisma, user_id: str, data: UserUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await db.user.update(where={"id": user_id}, data=update_data)


async def deactivate_user(db: Prisma, user_id: str):
    return await db.user.update(where={"id": user_id}, data={"isActive": False})
