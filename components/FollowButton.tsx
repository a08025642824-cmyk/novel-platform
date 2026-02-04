'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  authorId: string;       // フォローされる相手のID
  onCountChange?: (diff: number) => void; // 数が変わった時に親に知らせる機能
};

export default function FollowButton({ authorId, onCountChange }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMe, setIsMe] = useState(false); // 自分自身かどうか

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 自分自身ならボタンを表示しない
      if (user.id === authorId) {
        setIsMe(true);
        return;
      }

      // フォロー済みかチェック
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', authorId)
        .maybeSingle();

      if (data) setIsFollowing(true);
    };

    checkStatus();
  }, [authorId]);

  const handleFollow = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('フォローするにはログインが必要です');
      setLoading(false);
      return;
    }

    try {
      if (isFollowing) {
        // フォロー解除
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', authorId);
        
        if (error) throw error;
        setIsFollowing(false);
        if (onCountChange) onCountChange(-1); // 数を1減らす

      } else {
        // フォローする
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: authorId,
          });

        if (error) throw error;
        setIsFollowing(true);
        if (onCountChange) onCountChange(1); // 数を1増やす
      }
    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 自分自身ならボタンを表示しない
  if (isMe) return null;

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-6 py-2 rounded-full text-sm font-bold transition shadow-lg border ${
        isFollowing
          ? 'bg-black text-white border-gray-600 hover:bg-gray-900' // フォロー中のデザイン
          : 'bg-white text-black border-transparent hover:bg-gray-200' // フォローするのデザイン
      }`}
    >
      {loading ? '処理中...' : (isFollowing ? 'フォロー中' : 'フォローする')}
    </button>
  );
}