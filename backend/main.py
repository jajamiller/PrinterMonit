from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.printers import router as printers_router
from app.routers.reports import router as reports_router
from app.routers.users import router as users_router

app = FastAPI(title="PrinterMonit API")

app.include_router(auth_router, prefix="/auth")
app.include_router(printers_router, prefix="/printers")
app.include_router(reports_router, prefix="/reports")
app.include_router(users_router, prefix="/users")

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}
