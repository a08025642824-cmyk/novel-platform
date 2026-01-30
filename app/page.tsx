import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link'; // ← これを追加

export const revalidate = 0;

export default async function Home() {
  // データベースから小説データを取得
  const { data: novels, error } = await supabase
    .from('novels')
    .select('*')
    .order('created_at', { ascending: false }); // 新しい順に表示

  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    // 親コンテナ：画面全体の高さに固定し、縦スクロールを有効にする
    <main className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black text-white">

      {novels?.map((novel) => (
        // 各作品のカード：画面いっぱいの高さ(h-screen)にし、スクロール位置をスナップさせる
        <section
          key={novel.id}
          className="h-screen w-full snap-start flex flex-col justify-end relative border-b border-gray-800"
        >
          {/* 背景画像 */}
          <div className="absolute inset-0 z-0">
            {novel.cover_image_url ? (
              // 画像がある場合：画面いっぱいに表示 + 暗くするフィルター
              <>
                <img
                  src={novel.cover_image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" /> {/* 文字を読みやすくするために少し暗くする */}
              </>
            ) : (
              // 画像がない場合：今まで通りグレーのグラデーション
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-black opacity-50" />
            )}
          </div>

          {/* コンテンツ部分（文字は画像の上に浮く） */}
          <div className="relative z-10 p-6 pb-20">
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded text-white">
                注目
              </span>
              <span className="text-sm text-gray-300">@{novel.author_id}</span>{/* 作家名を入れる場所 */}
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight drop-shadow-md">
              {novel.title}
            </h1>

            <p className="text-lg text-gray-200 mb-6 line-clamp-3">
              {novel.description}
            </p>

            <div className="flex space-x-4">
              <Link href={`/novel/${novel.id}`} className="flex-1">
                <button className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition">
                  試し読み
                </button>
              </Link>
              <button className="flex-1 bg-gray-800/80 backdrop-blur-md text-white font-bold py-3 rounded-full border border-gray-600">
                ¥{novel.price}で購入
              </button>
            </div>
          </div>

          {/* 右側のアイコン列（いいね、コメントなど） */}
          <div className="absolute right-4 bottom-24 flex flex-col space-y-6 z-20">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-1">❤️</div>
              <span className="text-xs">1.2k</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-1">💬</div>
              <span className="text-xs">84</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-1">📤</div>
              <span className="text-xs">Share</span>
            </div>
          </div>

        </section>
      ))}

      {/* 作品がない場合の表示 */}
      {(!novels || novels.length === 0) && (
        <div className="h-screen flex items-center justify-center">
          <p>まだ作品がありません</p>
        </div>
      )}
    </main>
  );
}