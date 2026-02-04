'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronLeft, LogOut, Trash2, Edit, JapaneseYen, Lock } from 'lucide-react';
import FollowButton from '@/components/FollowButton';

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // フォロー数
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. プロフィール取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      setProfile(profileData);

      // 2. 小説取得（ここを修正！）
      let query = supabase
        .from('novels')
        .select('*')
        .eq('author_id', id)
        .order('created_at', { ascending: false });

      // ★重要: もし「自分」じゃなければ、公開済みのものだけを取得する
      if (!user || user.id !== id) {
        query = query.eq('is_published', true);
      }

      const { data: novelsData } = await query;
      setNovels(novelsData || []);

      // 3. フォロワー数など
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);
      setFollowerCount(followers || 0);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);
      setFollowingCount(following || 0);

      setLoading(false);
    };

    getData();
  }, [id]);

  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) return;
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDelete = async (novelId: string) => {
    if (!confirm('本当にこの作品を削除しますか？（元に戻せません）')) return;

    const { error } = await supabase
      .from('novels')
      .delete()
      .eq('id', novelId);

    if (error) {
      alert('エラー: ' + error.message);
    } else {
      setNovels(novels.filter((n) => n.id !== novelId));
      alert('削除しました');
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">読み込み中...</div>;
  if (!profile) return <div className="min-h-screen bg-black text-white p-10 text-center">作家が見つかりません</div>;

  const isMyPage = currentUser && currentUser.id === id;

  // ★ここで「下書き」と「公開中」を分ける
  const publishedNovels = novels.filter(n => n.is_published);
  const draftNovels = novels.filter(n => !n.is_published);

  return (
      <div className="h-[100dvh] overflow-y-auto bg-black text-white pb-24 font-sans">
      
      {/* ヘッダーエリア */}
      <div className="h-40 bg-gradient-to-r from-blue-900 to-purple-900 relative">
        <Link href="/" className="absolute top-4 left-4 bg-black/30 p-2 rounded-full text-white hover:bg-white/20 transition">
          <ChevronLeft size={24} />
        </Link>
        {isMyPage && (
          <button 
            onClick={handleLogout}
            className="absolute top-4 right-4 p-2 bg-black/30 rounded-full hover:bg-red-600/80 transition"
            title="ログアウト"
          >
            <LogOut size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* プロフィール情報 */}
      <div className="px-6 -mt-16 mb-8 relative z-10">
        <div className="flex justify-between items-end">
          <div className="w-32 h-32 rounded-full bg-black border-4 border-black overflow-hidden shadow-xl">
            <img 
              src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} 
              alt="avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="mb-4">
            {isMyPage ? (
              <div className="flex gap-3">
                <Link href="/profile/edit">
                  <button className="bg-gray-800 text-white font-bold px-4 py-2 rounded-full text-sm hover:bg-gray-700 transition border border-gray-600 flex items-center gap-2">
                    <Edit size={16} />
                    編集
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button className="bg-blue-900/40 text-blue-200 font-bold px-4 py-2 rounded-full text-sm hover:bg-blue-900/60 transition border border-blue-800 flex items-center gap-2">
                    <JapaneseYen size={16} />
                    売上管理
                  </button>
                </Link>
              </div>
            ) : (
              <FollowButton 
                authorId={id} 
                onCountChange={(diff) => setFollowerCount(prev => prev + diff)} 
              />
            )}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold">{profile.username || '名無し作家'}</h1>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {profile.bio || '自己紹介文はまだ設定されていません。'}
          </p>
        </div>

        <div className="flex mt-6 gap-6 border-b border-gray-800 pb-6">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg text-white">{followingCount}</span> 
            <span className="text-gray-500 text-xs">フォロー中</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg text-white">{followerCount}</span> 
            <span className="text-gray-500 text-xs">フォロワー</span>
          </div>
        </div>
      </div>

      {/* ★追加: 下書きエリア（自分が見ている時だけ表示） */}
      {isMyPage && draftNovels.length > 0 && (
        <div className="px-4 mb-10">
          <h2 className="font-bold text-lg mb-4 flex items-center text-gray-400">
            <Lock size={20} className="mr-2" />
            下書き ({draftNovels.length})
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {draftNovels.map((novel) => (
              <div key={novel.id} className="relative group opacity-80 hover:opacity-100 transition">
                <Link href={`/editor?id=${novel.id}`} className="block">
                  <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden relative mb-2 border border-gray-700 border-dashed">
                    {/* 下書きっぽいオーバーレイ */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600">Draft</span>
                    </div>
                    {novel.cover_image_url ? (
                      <img src={novel.cover_image_url} alt={novel.title} className="w-full h-full object-cover grayscale opacity-50" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-3 z-20">
                      <h3 className="font-bold text-sm text-gray-200 line-clamp-2 leading-tight">
                        {novel.title || '無題'}
                      </h3>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(novel.id)}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition z-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 公開作品リスト */}
      <div className="px-4">
        <h2 className="font-bold text-lg mb-4 flex items-center">
          <BookOpen size={20} className="mr-2" />
          公開作品 ({publishedNovels.length})
        </h2>
        {publishedNovels.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">
            {isMyPage ? '公開中の作品はありません' : 'まだ作品がありません'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {publishedNovels.map((novel) => (
              <div key={novel.id} className="relative group">
                <Link href={`/novel/${novel.id}`} className="block">
                  <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden relative mb-2 border border-gray-800 shadow-md group-hover:border-gray-600 transition">
                    {novel.cover_image_url ? (
                      <img src={novel.cover_image_url} alt={novel.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3">
                      <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">
                        {novel.title}
                      </h3>
                      <span className="text-xs text-blue-300 mt-1 block">
                        {novel.price === 0 ? '無料' : `¥${novel.price}`}
                      </span>
                    </div>
                  </div>
                </Link>
                {isMyPage && (
                  <button
                    onClick={() => handleDelete(novel.id)}
                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100 z-10"
                    title="作品を削除"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}