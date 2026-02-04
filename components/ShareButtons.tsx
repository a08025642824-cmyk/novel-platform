'use client';

import { Twitter, Link as LinkIcon, Check } from 'lucide-react'; // LINEアイコンはLucideにないのでSVGで描画
import { useState, useEffect } from 'react';

type ShareButtonsProps = {
  title?: string; // シェア時の文章（「面白い小説見つけた！」など）
  url?: string;   // シェアするURL（指定しなければ現在のページ）
};

export default function ShareButtons({ title = 'おすすめの小説投稿サイト', url }: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // クライアント側で現在のURLを取得
  useEffect(() => {
    setShareUrl(url || window.location.href);
  }, [url]);

  // URLをクリップボードにコピーする機能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後に戻す
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  // X (Twitter) シェア
  const handleTwitterShare = () => {
    const text = encodeURIComponent(title);
    const link = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${link}`, '_blank');
  };

  // LINE シェア
  const handleLineShare = () => {
    const link = encodeURIComponent(shareUrl);
    window.open(`https://social-plugins.line.me/lineit/share?url=${link}`, '_blank');
  };

  return (
    <div className="flex gap-3">
      {/* X (Twitter) */}
      <button
        onClick={handleTwitterShare}
        className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 text-white flex items-center justify-center transition border border-gray-700"
        title="Xでシェア"
      >
        <Twitter size={18} />
      </button>

      {/* LINE */}
      <button
        onClick={handleLineShare}
        className="w-10 h-10 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white flex items-center justify-center transition"
        title="LINEで送る"
      >
        {/* LucideにLINEアイコンがないのでSVG直書き */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 5.6 2 10c0 2.5 1.4 4.7 3.7 6.1 0.4 0.2 0.3 0.6 0.2 1.1-0.1 0.6-0.5 2.1-0.5 2.2 0 0-0.1 0.2 0.1 0.3 0.2 0.1 0.4 0 0.6-0.1 2.3-1.6 3.1-2 3.8-2.3 0.7 0.1 1.4 0.2 2.1 0.2 5.5 0 10-3.6 10-8S17.5 2 12 2z" />
        </svg>
      </button>

      {/* リンクコピー */}
      <button
        onClick={handleCopy}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
          copied 
            ? 'bg-green-600 border-green-600 text-white' 
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
        }`}
        title="リンクをコピー"
      >
        {copied ? <Check size={18} /> : <LinkIcon size={18} />}
      </button>
    </div>
  );
}