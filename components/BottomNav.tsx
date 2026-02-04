'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // 追加
import { Home, PenTool, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  // ★追加：ログイン中のユーザーIDを取得する
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // 小説を読んでいるとき（/novel/...）はメニューを隠す
  if (pathname.startsWith('/novel/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-gray-800 pb-safe z-50 h-16">
      <div className="flex justify-around items-center h-full max-w-md mx-auto relative">

        {/* ホームボタン */}
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center w-16 ${pathname === '/' ? 'text-white' : 'text-gray-500'}`}
        >
          <Home size={24} />
          <span className="text-[10px] mt-1 font-bold">ホーム</span>
        </Link>

        {/* 投稿ボタン（真ん中で目立たせる） */}
        <div className="relative -top-5">
          <Link href="/editor" className="flex flex-col items-center">
            <div className={`p-4 rounded-full shadow-lg shadow-blue-900/50 text-white transition transform hover:scale-105 ${
              pathname === '/editor' 
                ? 'bg-white text-black' // 選択中は白反転
                : 'bg-gradient-to-tr from-blue-600 to-purple-600' // 通常はグラデーション
            }`}>
              <PenTool size={24} />
            </div>
          </Link>
        </div>

        {/* マイページボタン（修正箇所） */}
        <Link 
          // ★IDがあれば自分のページへ、なければログイン画面へ
          href={userId ? `/users/${userId}` : '/login'} 
          className={`flex flex-col items-center justify-center w-16 ${
            // 自分のページを見ている時だけ白くする
            pathname.startsWith('/users/') && pathname.includes(userId || 'guest') 
              ? 'text-white' 
              : 'text-gray-500'
          }`}
        >
          <User size={24} />
          <span className="text-[10px] mt-1 font-bold">マイページ</span>
        </Link>

      </div>
    </nav>
  );
}