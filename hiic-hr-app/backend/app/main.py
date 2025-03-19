from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.routers.chat import router as chat_router
from app.routers.visualizations import router as visualizations_router
from app.core.config import settings
from app.core.error_handler import error_handler_middleware
from app.api import admin
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
app.include_router(visualizations_router)  # 可视化路由已经包含了/api/visualizations前缀
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

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
    # 启动应用
    # 从配置中获取超时设置
    timeout_seconds = 45  # 固定超时设置为45秒，足够处理大部分查询
    
    # 配置uvicorn服务器
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=settings.API_PORT,
        reload=settings.DEBUG,
        timeout_keep_alive=timeout_seconds,
        timeout_graceful_shutdown=timeout_seconds
    ) 