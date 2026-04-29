from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db.database import get_db

router = APIRouter(prefix="/api", tags=["hello"])

@router.get("/hello")
async def get_hello():
    return {"message": "Hello from FastAPI!", "status": "success"}

@router.get("/hello/{name}")
async def get_hello_name(name: str):
    return {"message": f"Hello, {name}!", "status": "success"}

@router.get("/db-test")
async def test_database(db: Session = Depends(get_db)):
    """Test database connection"""
    try:
        # Simple test to verify database is accessible
        db.execute("SELECT 1")
        return {"message": "Database connection successful", "status": "success"}
    except Exception as e:
        return {"message": f"Database error: {str(e)}", "status": "error"}
