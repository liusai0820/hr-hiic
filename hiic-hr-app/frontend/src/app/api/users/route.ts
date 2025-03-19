import { NextResponse } from 'next/server';
import axios from 'axios';

// 设置为动态路由，防止在构建时预渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 调用后端API获取所有用户
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { detail: error.response?.data?.detail || '获取用户列表失败' },
      { status: error.response?.status || 500 }
    );
  }
} 