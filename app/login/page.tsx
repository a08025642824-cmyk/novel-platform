'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ログイン処理
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setMessage('エラー: ' + error.message);
      setLoading(false);
    } else {
      // 成功したらトップページへ
      router.push('/');
      router.refresh(); // 画面を更新してログイン状態を反映
    }
  };

  // 新規登録処理
  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage('エラー: ' + error.message);
    } else {
      setMessage('登録確認メールを送りました！メール内のリンクを押してください。');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center">ログイン / 新規登録</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 outline-none"
              placeholder="user@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 outline-none"
              placeholder="6文字以上で入力"
            />
          </div>

          {message && <p className="text-red-400 text-sm text-center">{message}</p>}

          <div className="pt-4 space-y-3">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 font-bold py-3 rounded-full hover:bg-blue-500 transition"
            >
              {loading ? '処理中...' : 'ログインする'}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-transparent border border-gray-600 font-bold py-3 rounded-full hover:bg-gray-800 transition"
            >
              新規登録する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}