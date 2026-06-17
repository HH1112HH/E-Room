"""add room feature toggles: enable_heartbeat, enable_pronunciation_correction, enable_voice_recognition

Revision ID: 3a1b2c3d4e5f
Revises: 9344b2bf093f
Create Date: 2026-06-07 06:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "3a1b2c3d4e5f"
down_revision: Union[str, None] = "7a41f215585b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("enable_heartbeat", sa.Boolean(), nullable=False, server_default=sa.text("1")))
    op.add_column("rooms", sa.Column("enable_pronunciation_correction", sa.Boolean(), nullable=False, server_default=sa.text("1")))
    op.add_column("rooms", sa.Column("enable_voice_recognition", sa.Boolean(), nullable=False, server_default=sa.text("1")))


def downgrade() -> None:
    op.drop_column("rooms", "enable_voice_recognition")
    op.drop_column("rooms", "enable_pronunciation_correction")
    op.drop_column("rooms", "enable_heartbeat")
