'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { JapaneseYen, TrendingUp, ShoppingBag, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getData = async () => {
      // 1. ログイン確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. 自分の作品が購入された履歴を取得
      // purchasesテーブルから、novel_id（作品）の author_id（作者）が自分であるものを探す
      // ※ Supabaseの結合クエリを使います
      const { data: mySales, error } = await supabase
        .from('purchases')
        .select(`
          *,
          novels ( title, author_id ),
          profiles:user_id ( username )
        `)
        .eq('novels.author_id', user.id) // 自分の作品に絞る
        .order('created_at', { ascending: false }); // 新しい順

      if (error) {
        console.error(error);
      } else {
        // nullで返ってきたデータ（自分の作品じゃないもの）を除外
        const validSales = mySales.filter((sale: any) => sale.novels !== null);
        setSales(validSales);

        // 合計売上を計算
        const total = validSales.reduce((sum, sale) => sum + sale.price, 0);
        setTotalRevenue(total);
      }
      setLoading(false);
    };

    getData();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">データを集計中...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* ヘッダー */}
      <header className="flex items-center p-4 border-b border-gray-800">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-800 transition">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-lg mr-10">売上ダッシュボード</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        
        {/* 売上サマリーカード */}
        <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-6 shadow-lg border border-white/10">
          <div className="flex items-center gap-2 text-blue-200 mb-2">
            <JapaneseYen size={20} />
            <span className="font-bold">総売上高</span>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight">
            ¥{totalRevenue.toLocaleString()}
          </p>
          <div className="mt-4 flex items-center text-sm text-blue-200 bg-black/20 w-fit px-3 py-1 rounded-full">
            <TrendingUp size={16} className="mr-1" />
            <span>販売数: {sales.length} 冊</span>
          </div>
        </div>

        {/* 売上履歴リスト */}
        <div>
          <h2 className="font-bold text-lg mb-4 flex items-center">
            <ShoppingBag size={20} className="mr-2" />
            最近の購入履歴
          </h2>

          {sales.length === 0 ? (
            <div className="text-center py-10 bg-gray-900 rounded-xl border border-gray-800 text-gray-500">
              まだ売上がありません。<br />
              作品を書いてシェアしましょう！
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm mb-1 line-clamp-1">{sale.novels.title}</p>
                    <p className="text-xs text-gray-400">
                      購入者: {sale.profiles?.username || '名無し'} • {new Date(sale.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-blue-400 font-bold">
                    +¥{sale.price}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}