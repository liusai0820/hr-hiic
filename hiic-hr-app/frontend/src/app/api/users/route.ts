import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    // 调用后端API获取所有用户
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { detail: error.response?.data?.detail || '获取用户列表失败' },
      { status: error.response?.status || 500 }
    );
  }
} 