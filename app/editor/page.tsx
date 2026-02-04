'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import mammoth from 'mammoth';
import { proofreadText } from '@/app/actions/proofread';
import { 
  Image as ImageIcon, 
  JapaneseYen, 
  X, 
  Loader2, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  Save, 
  Send 
} from 'lucide-react';

// ★重要: ロジック部分は「EditorContent」として分離します
function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // 基本情報
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [content, setContent] = useState('');
  
  // 画像
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  // ステート
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // AI校閲
  const [isProofreading, setIsProofreading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. ユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ログインが必要です');
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // 2. 編集モード（editIdがある）ならDBからデータを取得
      if (editId) {
        setLoading(true);
        const { data: novel, error } = await supabase
          .from('novels')
          .select('*')
          .eq('id', editId)
          .single();
        
        if (error || !novel) {
          alert('作品の読み込みに失敗しました');
          router.push('/');
          return;
        }

        if (novel.author_id !== user.id) {
          alert('編集権限がありません');
          router.push('/');
          return;
        }

        setTitle(novel.title);
        setDescription(novel.description || '');
        setPrice(String(novel.price));
        setContent(novel.content || '');
        if (novel.cover_image_url) {
          setExistingCoverUrl(novel.cover_image_url);
          setCoverPreview(novel.cover_image_url);
        }
        setLoading(false);

      } else {
        // 3. 新規投稿モードなら復元
        const savedTitle = localStorage.getItem('draft_title');
        const savedDesc = localStorage.getItem('draft_description');
        const savedContent = localStorage.getItem('draft_content');
        
        if (savedTitle) setTitle(savedTitle);
        if (savedDesc) setDescription(savedDesc);
        if (savedContent) setContent(savedContent);
      }
    };

    init();
  }, [editId, router]);

  // 自動保存
  useEffect(() => {
    // ★重要: 編集モードの時は「新規投稿用の下書き」を上書きしない
    if (editId) return;

    const timer = setTimeout(() => {
      localStorage.setItem('draft_title', title);
      localStorage.setItem('draft_description', description);
      localStorage.setItem('draft_content', content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, description, content, editId]);

  const clearDraft = () => {
    // 新規投稿時のみクリア
    if (!editId) {
      localStorage.removeItem('draft_title');
      localStorage.removeItem('draft_description');
      localStorage.removeItem('draft_content');
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extractedText = result.value.trim();
      if (!extractedText) { alert('テキストが見つかりませんでした。'); return; }
      if (content && !confirm('上書きしてよろしいですか？')) return;
      setContent(extractedText);
      alert('読み込みました！');
    } catch (error) { console.error(error); alert('読み込み失敗'); } 
    finally { setIsLoadingFile(false); e.target.value = ''; }
  };

  const handleProofread = async () => {
    if (!content) return alert('本文がありません');
    setIsProofreading(true);
    setSuggestions([]);
    setShowSuggestions(true);
    const result = await proofreadText(content);
    if (result.error) alert(result.error);
    else setSuggestions(result);
    setIsProofreading(false);
  };

  const handleSave = async (isPublished: boolean) => {
    if (!title) return alert('タイトルは必須です');
    if (!content) return alert('本文を入力してください');
    if (!userId) return;

    if (isPublished) setLoading(true);
    else setIsSavingDraft(true);

    try {
      let finalCoverUrl = existingCoverUrl;
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, coverFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName);
        finalCoverUrl = publicUrl;
      }

      const saveData = {
        title: title,
        description: description,
        author_id: userId,
        price: Number(price),
        is_published: isPublished,
        cover_image_url: finalCoverUrl,
        content: content,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (editId) {
        const { error: updateError } = await supabase
          .from('novels')
          .update(saveData)
          .eq('id', editId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('novels')
          .insert([saveData]);
        error = insertError;
      }

      if (error) throw error;

      clearDraft();

      if (isPublished) {
        alert(editId ? '作品を更新して公開しました！' : '作品を公開しました！');
        router.push('/'); 
      } else {
        alert('下書きを保存しました！');
        router.push('/mypage'); 
      }
      router.refresh();

    } catch (e: any) {
      alert('エラー: ' + e.message);
    } finally {
      setLoading(false);
      setIsSavingDraft(false);
    }
  };

  if (!userId) return <div className="p-8 text-center text-white">読み込み中...</div>;

  return (
    // ★重要: スクロール設定 (h-[100dvh] overflow-y-auto) をここに適用
    <div className="h-[100dvh] overflow-y-auto bg-[#111] text-gray-200 p-8 max-w-4xl mx-auto pb-24 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-white">
        {editId ? '作品を編集する' : '新作を投稿する'}
      </h1>

      <div className="space-y-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <label className="block font-bold mb-2 text-gray-400 text-sm">表紙画像</label>
            {!coverPreview ? (
              <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-600 border-dashed rounded-xl aspect-[2/3] flex flex-col items-center justify-center transition group">
                <ImageIcon size={32} className="mb-2 group-hover:text-white transition" />
                <span className="text-xs font-bold">画像を選択</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </label>
            ) : (
              <div className="relative w-full aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden border border-gray-600 group">
                <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => { setCoverFile(null); setCoverPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition opacity-0 group-hover:opacity-100"><X size={16} /></button>
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-6">
            <div>
              <label className="block font-bold mb-2 text-gray-400 text-sm">タイトル</label>
              <input type="text" className="w-full p-4 bg-gray-900 border border-gray-700 rounded-lg text-xl font-bold text-white focus:border-blue-500 outline-none transition" placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-400 text-sm">あらすじ</label>
              <textarea className="w-full h-32 p-4 bg-gray-900 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 outline-none transition resize-none" placeholder="あらすじ..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-400 text-sm">販売価格 (円)</label>
              <div className="relative"><JapaneseYen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="number" min="0" className="w-full p-4 pl-12 bg-gray-900 border border-gray-700 rounded-lg text-xl font-bold text-white focus:border-blue-500 outline-none transition" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 my-8"></div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">本文</h2>
            <div className="flex gap-3">
              <button onClick={handleProofread} disabled={isProofreading || !content} className="flex items-center gap-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700/50 font-bold py-2 px-5 rounded-full transition disabled:opacity-50 text-sm">{isProofreading ? <><Loader2 size={16} className="animate-spin" /> 校閲中...</> : <><Sparkles size={16} /> AI校閲</>}</button>
            </div>
          </div>
          <div className="mb-6 p-6 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed hover:border-blue-500/50 hover:bg-gray-800/50 transition group relative">
            <div className="flex flex-col items-center justify-center gap-3">
              {isLoadingFile ? <><Loader2 className="animate-spin text-blue-400" size={32} /><p className="text-sm font-bold text-gray-300">Wordファイルを解析中...</p></> : <><div className="p-3 bg-gray-700 rounded-full group-hover:bg-blue-600 transition text-white"><FileText size={24} /></div><div className="text-center"><p className="font-bold text-gray-200">Wordファイルを読み込む</p><p className="text-xs text-gray-500 mt-1">ここをクリックして .docx ファイルを選択</p></div></>}
            </div>
            <input type="file" accept=".docx" onChange={handleFileUpload} disabled={isLoadingFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-6 bg-gray-900 rounded-lg border border-yellow-900/50 overflow-hidden">
               <div className="bg-yellow-900/20 px-4 py-3 border-b border-yellow-900/30 flex items-center gap-2"><AlertCircle className="text-yellow-500" size={20} /><h3 className="font-bold text-yellow-500">AIからの修正提案 ({suggestions.length}件)</h3></div>
               <div className="p-4 max-h-60 overflow-y-auto space-y-3 custom-scrollbar">{suggestions.map((item, index) => (<div key={index} className="flex gap-4 p-3 bg-black/20 rounded border border-gray-800 hover:border-gray-700 transition"><div className="flex-1 text-sm"><div className="flex items-center gap-2 mb-1"><span className="text-red-400 line-through opacity-70">{item.original}</span><span className="text-gray-500">→</span><span className="text-green-400 font-bold">{item.suggestion}</span></div><p className="text-xs text-gray-500">{item.reason}</p></div><button onClick={() => { setContent(prev => prev.replace(item.original, item.suggestion)); alert('修正を適用しました'); }} className="text-xs bg-gray-800 hover:bg-green-900 text-gray-300 hover:text-green-100 px-3 py-1 rounded border border-gray-700 transition h-fit self-center">適用</button></div>))}</div>
            </div>
          )}
          <textarea className="w-full h-[600px] bg-gray-900 border border-gray-700 text-gray-100 p-8 rounded-xl leading-loose text-lg focus:outline-none focus:border-blue-500 transition resize-none font-serif shadow-inner placeholder-gray-700" placeholder="ここに小説を執筆します..." value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div className="pt-8 flex flex-col md:flex-row justify-end gap-4">
          <button onClick={() => handleSave(false)} disabled={isSavingDraft || loading} className="w-full md:w-auto bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 px-8 rounded-full transition disabled:opacity-50 flex items-center justify-center gap-2">
            {isSavingDraft ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            下書き保存
          </button>
          <button onClick={() => handleSave(true)} disabled={isSavingDraft || loading} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-12 rounded-full transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20">
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            {editId ? '更新して公開' : '作品を公開する'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ★最重要: Suspenseでラップしてデフォルトエクスポートすることでエラー回避
export default function Editor() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111] flex items-center justify-center text-white">読み込み中...</div>}>
      <EditorContent />
    </Suspense>
  );
}