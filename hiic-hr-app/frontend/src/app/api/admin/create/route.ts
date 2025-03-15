import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // 创建用户账号
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'admin'
        }
      }
    });

    if (error) {
      console.error('创建管理员账号失败:', error);
      return NextResponse.json(
        { error: error.message || '创建管理员账号失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '管理员账号创建成功',
      user: data.user
    });
  } catch (error: any) {
    console.error('创建管理员账号失败:', error);
    return NextResponse.json(
      { error: error.message || '创建管理员账号失败' },
      { status: 500 }
    );
  }
} 