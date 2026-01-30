'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Heart } from 'lucide-react'; // ハートのアイコン

export default function LikeButton({ novelId }: { novelId: string }) {
  const [liked, setLiked] = useState(false); // 自分がいいねしてるか？
  const [count, setCount] = useState(0);     // 全体のいいね数
  const [loading, setLoading] = useState(false);

  // 初回ロード時に「今のいいね数」と「自分がいいねしてるか」を確認
  useEffect(() => {
    const checkLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. 全体のいいね数を数える
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true }) // head:true はデータの中身を取らず数だけ数える軽量モード
        .eq('novel_id', novelId);
      
      setCount(count || 0);

      // 2. 自分がログインしていて、既にいいねしてるか確認
      if (user) {
        const { data } = await supabase
          .from('likes')
          .select('*')
          .eq('novel_id', novelId)
          .eq('user_id', user.id)
          .single();
        
        if (data) setLiked(true);
      }
    };

    checkLikeStatus();
  }, [novelId]);

  // ボタンが押されたときの処理
  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('いいねするにはログインしてください');
      setLoading(false);
      return;
    }

    if (liked) {
      // 既にいいねしてるなら → 取り消す（削除）
      await supabase
        .from('likes')
        .delete()
        .eq('novel_id', novelId)
        .eq('user_id', user.id);
      
      setLiked(false);
      setCount((prev) => prev - 1); // 表示を1減らす
    } else {
      // まだしてないなら → いいねする（追加）
      await supabase
        .from('likes')
        .insert([{ novel_id: novelId, user_id: user.id }]);
      
      setLiked(true);
      setCount((prev) => prev + 1); // 表示を1増やす
    }

    setLoading(false);
  };

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition transform active:scale-95 ${
        liked 
          ? 'bg-pink-600 text-white shadow-pink-500/30' // いいね済み：ピンク
          : 'bg-white text-black hover:bg-gray-100'     // 未いいね：白
      }`}
    >
      <Heart 
        size={20} 
        fill={liked ? "currentColor" : "none"} // いいね済みなら塗りつぶす
        className={liked ? "animate-pulse" : ""}
      />
      <span>{liked ? 'Thanks!' : 'いいね'}</span>
      <span className="bg-black/10 px-2 py-0.5 rounded-full text-xs ml-1">
        {count}
      </span>
    </button>
  );
}