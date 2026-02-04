'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Heart } from 'lucide-react';

// ★ propsに isVertical を追加
export default function LikeButton({ novelId, isVertical = false }: { novelId: string, isVertical?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { count: totalCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('novel_id', novelId);
      
      setCount(totalCount || 0);

      if (user) {
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('novel_id', novelId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) setLiked(true);
      }
    };

    fetchData();
  }, [novelId]);

  const handleToggleLike = async () => {
    if (loading) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('いいねするにはログインが必要です');
      setLoading(false);
      return;
    }

    try {
      if (liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('novel_id', novelId)
          .eq('user_id', user.id);
        if (error) throw error;
        setLiked(false);
        setCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ novel_id: novelId, user_id: user.id }]);
        if (error) throw error;
        setLiked(true);
        setCount((prev) => prev + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ★ デザインの切り替え
  if (isVertical) {
    // 【縦長モード】トップページ用（アイコンの下に数字）
    return (
      <button 
        onClick={handleToggleLike} 
        disabled={loading}
        className="flex flex-col items-center group"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition mb-1 ${
          liked ? 'bg-red-500/20 text-red-500' : 'bg-black/40 backdrop-blur-sm text-white'
        }`}>
          <Heart 
            size={24} 
            fill={liked ? "currentColor" : "none"} 
            className={`transition-transform duration-300 ${liked ? 'scale-110' : 'group-hover:scale-110'}`}
          />
        </div>
        <span className="text-xs font-bold drop-shadow-md text-white">
          {count}
        </span>
      </button>
    );
  }

  // 【横長モード】詳細ページ用（アイコンの横に数字）
  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
        liked 
          ? 'bg-red-500/20 text-red-500 border border-red-500/50' 
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600'
      }`}
    >
      <Heart 
        size={20} 
        fill={liked ? "currentColor" : "none"} 
        className={`transition-transform ${liked ? 'scale-110' : ''}`}
      />
      <span className="font-bold min-w-[1ch] text-center">
        {count}
      </span>
    </button>
  );
}