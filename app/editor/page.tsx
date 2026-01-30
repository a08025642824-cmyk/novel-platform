'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, JapaneseYen } from 'lucide-react'; // 円マークを追加

export default function Editor() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // ↓ 価格の状態を追加（最初は0）
  const [price, setPrice] = useState('0');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ログインが必要です');
        router.push('/login');
      } else {
        setUserId(user.id);
      }
    };
    checkUser();
  }, [router]);

  const uploadImage = async (file: File) => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { error } = await supabase.storage.from('covers').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName);
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!title || !content) return alert('タイトルと本文は必須です');
    if (!userId) return;

    setLoading(true);

    try {
      let coverUrl = null;
      if (file) {
        coverUrl = await uploadImage(file);
      }

      // ★ここで入力された price を使う！
      const { error } = await supabase
        .from('novels')
        .insert([
          {
            title: title,
            content: content,
            author_id: userId,
            price: Number(price), // 文字列を数字に変換
            is_published: true,
            cover_image_url: coverUrl,
          },
        ]);

      if (error) throw error;

      alert('投稿しました！');
      router.push('/');
      router.refresh();

    } catch (e: any) {
      alert('エラーが発生しました: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-3xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">新作を書く</h1>

      <div className="space-y-6">
        {/* 画像選択 */}
        <div>
          <label className="block font-bold mb-2">表紙画像（任意）</label>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 px-4 py-3 rounded-lg flex items-center transition">
              <ImageIcon size={20} className="mr-2" />
              <span>画像を選ぶ</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                }}
              />
            </label>
            {file && <span className="text-sm text-green-600 font-bold">選択中: {file.name}</span>}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="block font-bold mb-2">タイトル</label>
          <input
            type="text"
            className="w-full p-4 border-2 border-gray-200 rounded-lg text-xl font-bold focus:border-black outline-none"
            placeholder="作品のタイトル..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* ★追加：価格設定 */}
        <div>
          <label className="block font-bold mb-2">販売価格 (0円で無料)</label>
          <div className="relative">
            <JapaneseYen size={20} className="absolute left-4 top-4 text-gray-500" />
            <input
              type="number"
              min="0"
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-lg text-xl font-bold focus:border-black outline-none"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* 本文 */}
        <div>
          <label className="block font-bold mb-2">本文</label>
          <textarea
            className="w-full h-96 p-4 border-2 border-gray-200 rounded-lg text-lg leading-relaxed focus:border-black outline-none resize-none"
            placeholder="ここに小説を書く..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={loading}
          className="w-full bg-black text-white font-bold py-4 rounded-full hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? '送信中...' : '公開する'}
        </button>
      </div>
    </div>
  );
}