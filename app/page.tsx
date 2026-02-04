import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import LikeButton from '@/components/LikeButton';
import CommentModal from '@/components/CommentModal';
import ShareButtons from '@/components/ShareButtons';

// 常に最新のデータを表示する設定
export const revalidate = 0;

export default async function Home() {
  const { data: novels, error } = await supabase
    .from('novels')
    .select('*, profiles(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    // ★修正1: fixed inset-0 h-[100dvh] で画面固定 & scrollbar-short 適用
    <main className="fixed inset-0 w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-black text-white z-0 scrollbar-short">

      {novels?.map((novel) => (
        <section
          key={novel.id}
          // ★修正2: スマホの実画面高さに合わせる
          className="h-[100dvh] w-full snap-start flex flex-col justify-end relative border-b border-gray-800"
        >
          {/* 背景画像 */}
          <div className="absolute inset-0 z-0">
            {novel.cover_image_url ? (
              <>
                <img
                  src={novel.cover_image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-black opacity-50" />
            )}
          </div>

          {/* コンテンツ部分 */}
          <div className="relative z-10 p-6 pb-24 max-w-[85%]">
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded text-white shadow-md">
                New
              </span>
              <Link href={`/users/${novel.author_id}`} className="text-sm text-gray-200 font-bold hover:underline drop-shadow-md">
                @{novel.profiles?.username || '名無し作家'}
              </Link>
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight drop-shadow-lg text-white">
              {novel.title}
            </h1>

            <p className="text-lg text-gray-200 mb-6 line-clamp-3 drop-shadow-md">
              {novel.description}
            </p>

            {/* ボタン列 */}
            <div className="flex space-x-4 translate-x-6">
              <Link href={`/novel/${novel.id}`} className="flex-1">
                <button className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition shadow-lg">
                  読む
                </button>
              </Link>
              {novel.price > 0 && (
                <div className="flex items-center justify-center px-4 bg-black/60 backdrop-blur-md rounded-full border border-white/30 text-white font-bold">
                  ¥{novel.price}
                </div>
              )}
            </div>
          </div>

          {/* ★修正: right-0 と inset-y-0 で縦いっぱいに広げる */}
          <div className="absolute right-0 inset-y-0 flex flex-col justify-center z-50 pointer-events-none pr-1">
            
            {/* 中身をクリック可能にする */}
            <div className="flex flex-col items-center gap-6 pointer-events-auto">

              {/* ① 作家プロフィール */}
              {/* translate-x-2 を削除し、relative left-2 に変更 */}
              <div className="flex flex-col items-center relative left-6">
                <Link href={`/users/${novel.author_id}`}>
                  <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden transition transform hover:scale-110">
                    <img
                      src={novel.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${novel.author_id}`}
                      alt="Author"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold border border-white">
                    +
                  </div>
                </Link>
              </div>

              {/* ② いいね */}
              {/* ここも relative left-2 に変更 */}
              <div className="flex flex-col items-center relative left-6">
                <LikeButton novelId={novel.id} isVertical={true} />
              </div>

              {/* ③ コメント */}
              {/* ★ここが一番重要！ translate を消して relative left-2 にすることで、モーダルの呪縛を解く */}
              <div className="flex flex-col items-center relative left-6">
                <CommentModal novelId={novel.id} authorId={novel.author_id} />
              </div>

              {/* ④ シェア */}
              {/* シェアボタンも位置を揃えるため relative left-2 に統一 */}
              <div className="flex flex-col items-center gap-1 relative left-2">
                <div className="transform scale-75 origin-right">
                  <ShareButtons title={novel.title} />
                </div>
                <span className="text-white text-xs font-bold drop-shadow-md pr-1">Share</span>
              </div>

            </div>
          </div>
          

        </section>
      ))}

      {(!novels || novels.length === 0) && (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">まだ投稿された作品がありません</p>
        </div>
      )}
    </main>
  );
}