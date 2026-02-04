'use client';

import { useEffect, useState, use, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import LikeButton from '@/components/LikeButton';
import PurchaseButton from '@/components/PurchaseButton';
import { Lock as LockIcon, BookOpen, ChevronLeft } from 'lucide-react';
import CommentSection from '@/components/CommentSection';

export default function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // 試し読みボタン用スクロール
  const contentRef = useRef<HTMLDivElement>(null);

  const [novel, setNovel] = useState<any>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  // ★追加1: 透かし用に閲覧者の情報を保存する
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // ★追加1: ここでユーザー情報をステートに保存
      setCurrentUser(user);

      const { data: novelData } = await supabase
        .from('novels')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (!novelData) {
        setLoading(false);
        return;
      }
      setNovel(novelData);

      let purchased = false;
      if (user && user.id === novelData.author_id) purchased = true;
      if (novelData.price === 0) purchased = true;

      if (user && !purchased) {
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('*')
          .eq('novel_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (purchaseData) purchased = true;
      }

      setIsPurchased(purchased);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleTrialRead = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <div className="min-h-screen bg-[#111] text-white p-10 text-center">読み込み中...</div>;
  if (!novel) return <div className="min-h-screen bg-[#111] text-white p-10 text-center">作品が見つかりません</div>;

  const contentText = novel.content || '';
  const displayContent = isPurchased
    ? contentText
    : contentText.slice(0, 100) + '...';

  return (
    // ★追加2: onContextMenu で右クリックを禁止（PC向け対策）
    <div
      // ★修正: h-[100dvh] で高さを固定し、overflow-y-auto でスクロールさせる
      className="h-[100dvh] overflow-y-auto bg-[#111] text-gray-200 font-sans leading-loose pb-40 relative"
      onContextMenu={(e) => e.preventDefault()}
    >

      {/* ★修正版：透かし（Watermark） */}
      {currentUser && (
        <div
          className="pointer-events-none fixed inset-0 z-[60] flex flex-wrap content-center justify-center overflow-hidden select-none"
          style={{ opacity: 0.01 }}
        >
          {Array(20).fill(0).map((_, i) => (
            <span key={i} className="mx-10 my-10 inline-block -rotate-12 text-sm font-bold text-white whitespace-nowrap">
              UID: {currentUser.id} <br /> DO NOT COPY
            </span>
          ))}
        </div>
      )}

      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 z-50 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-black/30 backdrop-blur-md text-white hover:bg-white/20 p-2 rounded-full transition flex items-center justify-center">
          <ChevronLeft size={24} />
        </Link>
      </header>

      {/* ヒーロー画像 */}
      {novel.cover_image_url && (
        <div className="w-full relative">
          <img
            src={novel.cover_image_url}
            alt={novel.title}
            className="w-full h-[300px] object-cover object-bottom shadow-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111]/60 to-[#111]" />
        </div>
      )}

      <main className={`max-w-2xl mx-auto px-6 relative z-10 ${novel.cover_image_url ? '-mt-24' : 'pt-24'}`}>

        {/* タイトル＆情報エリア */}
        <div className="mb-10 border-b border-gray-800 pb-8">
          <h1 className="text-3xl font-bold text-white mb-4 leading-relaxed drop-shadow-lg">
            {novel.title}
          </h1>

          <div className="flex items-center justify-between">
            <Link href={`/users/${novel.author_id}`} className="flex items-center group">
              <div className="w-10 h-10 rounded-full border border-gray-600 overflow-hidden mr-3">
                <img
                  src={novel.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${novel.author_id}`}
                  alt="Author"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-300 group-hover:text-blue-400 transition">
                  {novel.profiles?.username || '名無し作家'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(novel.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>

            <span className="bg-blue-900/40 border border-blue-500/30 px-3 py-1 rounded-full text-blue-200 text-sm font-bold">
              {novel.price === 0 ? '無料' : `¥${novel.price}`}
            </span>
          </div>
        </div>

        <div ref={contentRef} className="relative min-h-[300px]">

          {/* ファイル投稿か、テキスト投稿かで表示を分ける */}
          {novel.file_url ? (
            // ■ ファイル投稿の場合
            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-xl border border-gray-700">
              <p className="text-gray-300 mb-6 font-bold">この作品はファイル形式で投稿されています</p>

              {isPurchased ? (
                <a
                  href={novel.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black font-bold px-8 py-4 rounded-full hover:bg-gray-200 transition shadow-lg flex items-center gap-2"
                >
                  <BookOpen size={20} />
                  作品ファイルを開く
                </a>
              ) : (
                <div className="flex flex-col items-center opacity-50">
                  <BookOpen size={48} className="mb-2" />
                  <p>購入するとファイルを閲覧できます</p>
                </div>
              )}
            </div>
          ) : (
            // ■ テキスト投稿の場合
            <>
              {/* ★追加4: select-none クラスを追加してコピペ禁止にする */}
              <div className={`text-gray-300 text-lg font-serif leading-loose whitespace-pre-wrap tracking-wide select-none ${!isPurchased && 'blur-sm opacity-50'}`}>
                {displayContent}
              </div>

              {!isPurchased && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-20">
                  <LockIcon size={48} className="text-white mb-4 drop-shadow-md" />
                  <p className="text-white font-bold text-xl drop-shadow-md">有料作品です</p>
                </div>
              )}
            </>
          )}

        </div>

        <CommentSection
          novelId={novel.id}
          isPurchased={isPurchased}
          authorId={novel.author_id}
        />

      </main>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#111]/95 border-t border-gray-800 backdrop-blur pt-4 pb-6 px-4 z-50 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="shrink-0">
            <LikeButton novelId={novel.id} />
          </div>

          <div className="flex-1 flex gap-3">
            {!isPurchased ? (
              <>
                <button
                  onClick={handleTrialRead}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-full flex items-center justify-center transition border border-gray-600 text-sm"
                >
                  <BookOpen size={18} className="mr-2" />
                  試し読み
                </button>
                <div className="flex-[1.5]">
                  <PurchaseButton novel={novel} isPurchased={isPurchased} />
                </div>
              </>
            ) : (
              <button className="w-full bg-white text-black font-bold py-3 rounded-full text-sm">
                購入済み
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}