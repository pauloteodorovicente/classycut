"""add share_token to projects

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-13 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col["name"] for col in inspector.get_columns("projects")]
    if "share_token" not in existing_columns:
        op.add_column(
            "projects",
            sa.Column("share_token", sa.String(64), nullable=True),
        )
    existing_indexes = [idx["name"] for idx in inspector.get_indexes("projects")]
    if "ix_projects_share_token" not in existing_indexes:
        op.create_index("ix_projects_share_token", "projects", ["share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_projects_share_token", table_name="projects")
    op.drop_column("projects", "share_token")
