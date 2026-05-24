"""add users table and user_id to projects

Revision ID: a1b2c3d4e5f6
Revises: 82be895c520c
Create Date: 2026-05-10 17:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "82be895c520c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes_users = [idx["name"] for idx in inspector.get_indexes("users")] if "users" in existing_tables else []
    if "ix_users_email" not in existing_indexes_users:
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    existing_columns_projects = [col["name"] for col in inspector.get_columns("projects")]
    if "user_id" not in existing_columns_projects:
        op.add_column(
            "projects",
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        )

    existing_indexes_projects = [idx["name"] for idx in inspector.get_indexes("projects")]
    if "ix_projects_user_id" not in existing_indexes_projects:
        op.create_index("ix_projects_user_id", "projects", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_column("projects", "user_id")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
