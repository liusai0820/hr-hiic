from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.routers.chat import router as chat_router
from app.core.config import settings
from app.core.error_handler import error_handler_middleware
import uvicorn

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# 添加错误处理中间件
app.middleware("http")(error_handler_middleware)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
    expose_headers=["*"],  # 暴露所有头部
)

# 包含API路由
app.include_router(router, prefix="/api")
app.include_router(chat_router, prefix="/chat")

# 根路径
@app.get("/")
async def root():
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs_url": "/docs",
        "api_url": "/api"
    }

if __name__ == "__main__":
    # 运行应用
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG) 