'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Camera, Save, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // フォームの内容
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const getData = async () => {
      // 1. ログインユーザー取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. プロフィール情報取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url || '');
      }
      setLoading(false);
    };

    getData();
  }, [router]);

  // 画像アップロード処理
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAvatarFile(file);
    // プレビュー用に一時的にURLを作る
    setAvatarUrl(URL.createObjectURL(file));
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;
    setUploading(true);

    try {
      let publicUrl = avatarUrl;

      // 画像が変更されていたらアップロード
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // データベース更新
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: publicUrl,
          // もし「作家になる」フラグが必要ならここで is_author: true も追加
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('プロフィールを更新しました！');
      router.push(`/users/${user.id}`); // 自分のページに戻る
      router.refresh();

    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* ヘッダー */}
      <header className="flex items-center p-4 border-b border-gray-800">
        <Link href={`/users/${user?.id}`} className="p-2 rounded-full hover:bg-gray-800 transition">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-lg mr-10">プロフィール編集</h1>
      </header>

      <div className="max-w-md mx-auto p-6 space-y-8">
        
        {/* アイコン画像変更 */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer w-32 h-32">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 group-hover:border-gray-600 transition">
              <img 
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            {/* カメラアイコンのオーバーレイ */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-full cursor-pointer">
              <Camera size={32} className="text-white" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          <p className="text-gray-500 text-xs mt-2">タップして画像を変更</p>
        </div>

        {/* 名前入力 */}
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">名前（ペンネーム）</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="名前を入力"
          />
        </div>

        {/* 自己紹介入力 */}
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">自己紹介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
            placeholder="好きなジャンルや活動について..."
          />
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={uploading}
          className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition flex items-center justify-center disabled:opacity-50"
        >
          {uploading ? '保存中...' : (
            <>
              <Save size={20} className="mr-2" />
              変更を保存する
            </>
          )}
        </button>

      </div>
    </div>
  );
}