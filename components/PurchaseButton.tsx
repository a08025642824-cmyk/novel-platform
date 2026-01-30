'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
// アイコンの名前がブラウザの機能と被らないように LockIcon に変更
import { Lock as LockIcon, Unlock } from 'lucide-react';

export default function PurchaseButton({ novel, isPurchased }: { novel: any, isPurchased: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // すでに購入済みなら
  if (isPurchased) {
    return (
      <button disabled className="flex-1 bg-gray-600 text-gray-300 font-bold py-3 rounded-full shadow-lg flex justify-center items-center gap-2 cursor-default">
        <Unlock size={20} />
        購入済み
      </button>
    );
  }

  // 無料作品ならボタンを表示しない
  if (novel.price === 0) return null;

  const handlePurchase = async () => {
    if (!confirm(`¥${novel.price} でこの記事を購入しますか？`)) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('購入するにはログインしてください');
      router.push('/login');
      return;
    }

    // ★修正ポイント： amount（金額）も一緒に保存する！
    const { error } = await supabase
      .from('purchases')
      .insert([
        { 
          novel_id: novel.id, 
          user_id: user.id,
          amount: novel.price  // ← これを追加しました！
        }
      ]);

    if (error) {
      alert('エラー: ' + error.message);
    } else {
      alert('購入ありがとうございます！');
      router.refresh(); 
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-full shadow-lg hover:bg-blue-500 transition flex justify-center items-center gap-2"
    >
      <LockIcon size={20} />
      {loading ? '処理中...' : `続きを購入 (¥${novel.price})`}
    </button>
  );
}