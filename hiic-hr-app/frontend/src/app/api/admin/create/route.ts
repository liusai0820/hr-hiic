import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 调用后端API创建管理员账号
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await axios.post(`${apiUrl}/api/admin/create`, {
      email,
      password
    });

    return NextResponse.json({
      message: '管理员账号创建成功',
      user: response.data.user
    });
  } catch (error: any) {
    console.error('创建管理员账号失败:', error);
    return NextResponse.json(
      { error: error.response?.data?.detail || '创建管理员账号失败' },
      { status: 500 }
    );
  }
} 