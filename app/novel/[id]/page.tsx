'use client'; // ★ここをサーバーからクライアントに変更！

import { useEffect, useState, use } from 'react'; // useを追加
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import LikeButton from '@/components/LikeButton';
import PurchaseButton from '@/components/PurchaseButton';
import { Lock as LockIcon } from 'lucide-react';

export default function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  // ★ Next.js 15以降の書き方に対応（paramsをほどく）
  const { id } = use(params);

  const [novel, setNovel] = useState<any>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. ログインユーザー確認
      const { data: { user } } = await supabase.auth.getUser();

      // 2. 小説データ取得
      const { data: novelData } = await supabase
        .from('novels')
        .select('*')
        .eq('id', id)
        .single();

      if (!novelData) {
        setLoading(false);
        return;
      }

      setNovel(novelData);

      // 3. 購入チェック
      let purchased = false;
      
      // 作者本人または無料ならOK
      if (user && user.id === novelData.author_id) purchased = true;
      if (novelData.price === 0) purchased = true;

      // 購入履歴を確認
      if (user && !purchased) {
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('*')
          .eq('novel_id', id)
          .eq('user_id', user.id)
          .maybeSingle(); // エラーを出さない安全な書き方
        
        if (purchaseData) purchased = true;
      }

      setIsPurchased(purchased);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#111] text-white p-10 text-center">読み込み中...</div>;
  if (!novel) return <div className="min-h-screen bg-[#111] text-white p-10 text-center">作品が見つかりません</div>;

  // 本文の表示制御
  const displayContent = isPurchased 
    ? novel.content 
    : novel.content.slice(0, 100) + '... (この先は購入すると読めます)';

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 font-sans leading-loose pb-24">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 z-50">
        <Link href="/" className="text-white hover:text-gray-300 flex items-center gap-2 font-bold drop-shadow-md">
          ← 戻る
        </Link>
      </header>

      {/* ヒーロー画像 */}
      {novel.cover_image_url && (
        <div className="w-full h-[50vh] relative">
          <img src={novel.cover_image_url} alt={novel.title} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111]/60 to-[#111]" />
        </div>
      )}

      <main className={`max-w-2xl mx-auto px-6 relative z-10 ${novel.cover_image_url ? '-mt-32' : 'pt-24'}`}>
        <div className="mb-12 border-b border-gray-800 pb-8 text-shadow">
          <h1 className="text-4xl font-bold text-white mb-4 leading-relaxed drop-shadow-lg">
            {novel.title}
          </h1>
          <p className="text-gray-400 text-sm">価格: ¥{novel.price}</p>
        </div>

        {/* 本文エリア */}
        <div className="relative">
          <div className={`text-lg text-gray-300 space-y-6 whitespace-pre-wrap leading-10 tracking-wide font-serif ${!isPurchased && 'blur-sm select-none opacity-50'}`}>
            {displayContent}
          </div>

          {/* 未購入時のロック画面 */}
          {!isPurchased && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <LockIcon size={48} className="text-white mb-4" />
              <p className="text-white font-bold text-xl">この作品は有料です</p>
            </div>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#111]/90 backdrop-blur border-t border-gray-800 p-4 safe-area-bottom z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <LikeButton novelId={novel.id} />
          {/* ↓ 購入済みなら「購入済み」ボタンに変わる */}
          <PurchaseButton novel={novel} isPurchased={isPurchased} />
        </div>
      </footer>
    </div>
  );
}