"""KrishiConnect FastAPI app.

Run:  cd backend && uvicorn main:app --reload   (http://localhost:8000/docs)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (admin_router, auth_router, buyers_router, fpo_router,
                     grievance_router, lots_router, prices_router,
                     requirements_router, transactions_router)
from database import Base, engine

Base.metadata.create_all(engine)

app = FastAPI(title="KrishiConnect (SIH 2026 PS #26132 prototype)",
              version="0.1.0-prototype",
              description="Decision engine + market linkage prototype. "
                          "All data is synthetic sample data; formulas are real.")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

app.include_router(auth_router.router)
app.include_router(lots_router.router)
app.include_router(prices_router.router)
app.include_router(buyers_router.router)
app.include_router(requirements_router.router)
app.include_router(fpo_router.router)
app.include_router(transactions_router.router)
app.include_router(grievance_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"app": "KrishiConnect", "status": "prototype",
            "docs": "/docs",
            "note": "Prices/buyers are synthetic sample data. Formulas and logic are real."}


@app.get("/health")
def health():
    return {"ok": True}
