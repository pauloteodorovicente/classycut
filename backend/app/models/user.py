import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: str = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: str = Column(String, unique=True, nullable=False, index=True)
    hashed_password: str = Column(String, nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
