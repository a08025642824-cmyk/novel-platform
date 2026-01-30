'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenTool, User } from 'lucide-react'; // アイコン

export default function BottomNav() {
  const pathname = usePathname(); // 今どのページにいるか？を知る

  // 小説を読んでいるとき（/novel/...）はメニューを隠す
  if (pathname.startsWith('/novel/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">

        {/* ホームボタン */}
        <Link href="/" className={`flex flex-col items-center ${pathname === '/' ? 'text-white' : 'text-gray-500'}`}>
          <Home size={24} />
          <span className="text-[10px] mt-1 font-bold">ホーム</span>
        </Link>

        {/* 投稿ボタン（真ん中で目立たせる） */}
        <Link href="/editor" className="flex flex-col items-center -mt-6">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-4 rounded-full shadow-lg text-white">
            <PenTool size={24} />
          </div>
        </Link>


        {/* とりあえず動作確認のために /login に飛ばします */}
        <Link href="/mypage" className="flex flex-col items-center text-gray-500">
          <User size={24} />
          <span className="text-[10px] mt-1 font-bold">マイページ</span>
        </Link>

      </div>
    </nav>
  );
}