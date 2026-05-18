from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routes import hello, collection, decks
from .db.database import init_db
from .services.price_updater import start_price_updater

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events"""
    # Startup
    print("Initializing database...")
    init_db()
    
    print("Starting background price updater (will run immediately, then every 24 hours)...")
    start_price_updater()
    
    yield
    
    # Shutdown
    print("Shutting down...")

app = FastAPI(title="Mana Binder API", lifespan=lifespan)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(hello.router)
app.include_router(collection.router)
app.include_router(decks.router)

@app.get("/")
async def root():
    return {"message": "Mana Binder API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)