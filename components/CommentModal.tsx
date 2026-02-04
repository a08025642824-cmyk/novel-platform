'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageCircle, Send, X, Lock } from 'lucide-react';
import Link from 'next/link';

type Props = {
  novelId: string;
  authorId: string;
};

export default function CommentModal({ novelId, authorId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(false);

  // 初期データ取得
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('novel_id', novelId);
      setCount(count || 0);
    };
    fetchCount();
  }, [novelId]);

  // モーダルを開く
  const handleOpen = async () => {
    setIsOpen(true);
    // スクロールを止める
    document.body.style.overflow = 'hidden';

    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    if (user) {
      if (user.id === authorId) {
        setIsPurchased(true);
      } else {
        const { data } = await supabase
          .from('purchases')
          .select('id')
          .eq('novel_id', novelId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setIsPurchased(true);
      }
    }

    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
  };

  // モーダルを閉じる
  const handleClose = () => {
    setIsOpen(false);
    document.body.style.overflow = '';
  };

  // コメント送信機能（修正版）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;

    setLoading(true);

    // 1. まずコメントを書き込む
    const { error } = await supabase
      .from('comments')
      .insert({ novel_id: novelId, user_id: userId, content: newComment });

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      // 2. 成功したら、まず入力欄を空にして、カウントを増やす
      setNewComment('');
      setCount((prev) => prev + 1);

      // 3. 最新のコメント一覧をサーバーから再取得する（これが一番確実！）
      const { data: newComments } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)') // ※ここがうまくいかない場合は後述のSQL修正が必要
        .eq('novel_id', novelId)
        .order('created_at', { ascending: true });

      if (newComments) {
        setComments(newComments);
      }
    }
    setLoading(false);
  };

  return (
    <>
      {/* ボタン部分 */}
      <button onClick={handleOpen} className="flex flex-col items-center group">
        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center mb-1 group-hover:bg-black/60 transition text-white border border-white/10">
          <MessageCircle size={24} className="fill-white/10" />
        </div>
        <span className="text-xs font-bold drop-shadow-md text-white">{count}</span>
      </button>

      {/* モーダル部分 */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end text-left">
          
          {/* 背景（ここをクリックで閉じる） */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={handleClose} 
          />

          {/* メインエリア */}
          <div className="relative bg-[#111] border-t border-gray-800 rounded-t-3xl h-[70vh] flex flex-col w-full max-w-md mx-auto animate-slide-up shadow-2xl z-[10000]">
            
            {/* ヘッダー（ここを不透明な黒にするのが重要） */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#111] rounded-t-3xl">
              <span className="font-bold text-white ml-2">コメント ({count})</span>
              <button 
                onClick={handleClose} 
                className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* コメントリスト */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center text-gray-500 py-10">まだコメントはありません</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 items-start animate-fade-in">
                    <Link href={`/users/${comment.user_id}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
                        <img 
                          src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} 
                          className="w-full h-full object-cover" 
                          alt="avatar"
                        />
                      </div>
                    </Link>
                    <div className="bg-gray-800/80 p-3 rounded-2xl rounded-tl-none border border-gray-700/50 max-w-[85%]">
                      <p className="text-xs font-bold text-gray-400 mb-1">{comment.profiles?.username}</p>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 入力エリア */}
            <div className="p-4 border-t border-gray-800 bg-[#111] pb-safe">
              {isPurchased ? (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="コメントを入力..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-3 text-white focus:border-blue-500 outline-none transition"
                  />
                  <button disabled={loading || !newComment} className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50 hover:bg-blue-500 transition shrink-0">
                    <Send size={20} />
                  </button>
                </form>
              ) : (
                <div className="bg-gray-900 rounded-xl p-3 flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <Lock size={16} />
                  <span>購入するとコメントできます</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}