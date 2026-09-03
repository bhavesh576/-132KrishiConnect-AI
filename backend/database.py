"""SQLite database setup (SQLAlchemy ORM).

Prototype note: single file-based DB (backend/krishiconnect.db) committed with
seed data so the app "just works" on any machine.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = "krishiconnect.db"  # resolved relative to backend/ working dir

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
