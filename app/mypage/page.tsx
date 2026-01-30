'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { LogOut, BookOpen, Trash2 } from 'lucide-react'; // アイコン追加
import Link from 'next/link';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myNovels, setMyNovels] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      // 1. ログインチェック
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 2. プロフィール取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // 3. 自分の小説取得
      const { data: novelsData } = await supabase
        .from('novels')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      setMyNovels(novelsData || []);
      setLoading(false);
    };

    getData();
  }, [router]);

  // ★追加：ログアウト処理
  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) return;
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // ★追加：削除処理
  const handleDelete = async (novelId: string) => {
    if (!confirm('本当にこの作品を削除しますか？（元に戻せません）')) return;

    // データベースから削除
    const { error } = await supabase
      .from('novels')
      .delete()
      .eq('id', novelId);

    if (error) {
      alert('エラー: ' + error.message);
    } else {
      // 画面からも消す（リロードしなくて済むように）
      setMyNovels(myNovels.filter((novel) => novel.id !== novelId));
      alert('削除しました');
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* ヘッダー画像エリア */}
      <div className="h-40 bg-gradient-to-r from-blue-900 to-purple-900 relative">
        {/* ★ここをログアウトボタンに変更 */}
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 p-2 bg-black/30 rounded-full backdrop-blur hover:bg-red-900/50 transition"
          title="ログアウト"
        >
          <LogOut size={20} className="text-white" />
        </button>
      </div>

      {/* プロフィール情報 */}
      <div className="px-6 -mt-12 mb-8">
        <div className="flex justify-between items-end">
          <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-black overflow-hidden">
            <img 
              src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
              alt="avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
          {/* 編集ボタン（まだ機能なし） */}
          <button className="bg-white text-black font-bold px-6 py-2 rounded-full text-sm mb-2 hover:bg-gray-200 transition">
            編集
          </button>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold">{profile?.username || '名無しさん'}</h1>
          <p className="text-gray-400 text-sm mt-1">ID: {profile?.id.slice(0, 8)}...</p>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed">
            {profile?.bio || 'プロフィール文がまだありません。'}
          </p>
        </div>

        <div className="flex mt-6 gap-6 border-b border-gray-800 pb-4">
          <div><span className="font-bold text-lg">0</span> <span className="text-gray-500 text-xs">フォロー</span></div>
          <div><span className="font-bold text-lg">0</span> <span className="text-gray-500 text-xs">フォロワー</span></div>
        </div>
      </div>

      {/* 作品リスト */}
      <div className="px-4">
        <h2 className="font-bold text-lg mb-4 flex items-center">
          <BookOpen size={20} className="mr-2" />
          自分の作品 ({myNovels.length})
        </h2>

        {myNovels.length === 0 ? (
          <p className="text-gray-500 text-sm">まだ投稿していません。</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {myNovels.map((novel) => (
              <div key={novel.id} className="relative group">
                {/* 作品リンク */}
                <Link href={`/novel/${novel.id}`} className="block">
                  <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden relative mb-2 border border-gray-700">
                    {novel.cover_image_url ? (
                      <img src={novel.cover_image_url} alt={novel.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2 text-white">
                        {novel.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">¥{novel.price}</p>
                    </div>
                  </div>
                </Link>

                {/* ★追加：削除ボタン（右上に配置） */}
                <button
                  onClick={() => handleDelete(novel.id)}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                  title="削除する"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}