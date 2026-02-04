'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageCircle, Send, Lock } from 'lucide-react';
import Link from 'next/link';

type Props = {
  novelId: string;
  isPurchased: boolean; // 親から「購入済みか？」を受け取る
  authorId: string;     // 作者ID（作者は無条件でコメントできるようにする）
};

export default function CommentSection({ novelId, isPurchased, authorId }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 初回読み込み
  useEffect(() => {
    const fetchComments = async () => {
      // ユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // コメント取得（古い順＝チャット形式）
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: true });

      if (data) setComments(data);
    };

    fetchComments();
  }, [novelId]);

  // コメント送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;

    setLoading(true);

    const { error } = await supabase
      .from('comments')
      .insert({
        novel_id: novelId,
        user_id: userId,
        content: newComment
      });

    if (error) {
      alert('エラー: ' + error.message);
    } else {
      // 成功したら画面に追加（リロードなしで反映）
      // 自分のプロフィール情報を簡易的に取得して表示に追加する
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', userId).single();
      
      setComments([...comments, {
        id: Date.now(), // 仮ID
        content: newComment,
        user_id: userId,
        created_at: new Date().toISOString(),
        profiles: profile
      }]);
      
      setNewComment(''); // 入力欄を空にする
    }
    setLoading(false);
  };

  // ★書き込み権限のチェック（購入者 または 作者 ならOK）
  const canComment = isPurchased || (userId === authorId);

  return (
    <div className="mt-16 border-t border-gray-800 pt-10">
      <h3 className="font-bold text-xl mb-6 flex items-center text-white">
        <MessageCircle className="mr-2" />
        読者のコメント ({comments.length})
      </h3>

      {/* コメント一覧 */}
      <div className="space-y-6 mb-10">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4 bg-gray-900/50 rounded-lg">
            まだコメントはありません。感想一番乗りしませんか？
          </p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 items-start animate-fade-in">
              {/* アイコン */}
              <Link href={`/users/${comment.user_id}`} className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
                  <img 
                    src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} 
                    alt="icon" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </Link>
              
              {/* 内容 */}
              <div className="bg-gray-800/80 p-3 rounded-2xl rounded-tl-none min-w-[200px] border border-gray-700">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-sm text-gray-300">
                    {comment.profiles?.username || '名無し'}
                    {comment.user_id === authorId && <span className="ml-2 bg-blue-600 text-[10px] px-1.5 py-0.5 rounded text-white">作者</span>}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* コメント入力フォーム（条件分岐） */}
      {canComment ? (
        // ■ 書き込める場合
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="感想や応援コメントを書こう..."
            className="w-full bg-black border border-gray-700 rounded-xl p-4 pr-14 text-white focus:border-blue-500 outline-none min-h-[100px] resize-none"
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition disabled:opacity-50 disabled:bg-gray-700"
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        // ■ 書き込めない場合（ロック表示）
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
          <Lock className="mx-auto mb-2 text-gray-500" />
          <p className="font-bold text-sm mb-1">コメントは購入者限定です</p>
          <p className="text-xs">この作品を購入すると、感想を書き込んだり<br/>他の読者と交流できるようになります。</p>
        </div>
      )}
    </div>
  );
}