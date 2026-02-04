require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const iconv = require('iconv-lite');

// ★設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTHOR_ID = 'ここに公式アカウントのUUIDを貼り付ける'; // ←忘れず設定！

// ★ボットが読む「名作リスト」
// 毎日ここからランダムに1つ選ばれます。URLを増やせば無限に投稿できます。
const STOCK_LIST = [
  { title: 'こころ', author: '夏目 漱石', url: 'https://www.aozora.gr.jp/cards/000148/files/773_14560.html' },
  { title: '坊っちゃん', author: '夏目 漱石', url: 'https://www.aozora.gr.jp/cards/000148/files/752_14964.html' },
  { title: '吾輩は猫である', author: '夏目 漱石', url: 'https://www.aozora.gr.jp/cards/000148/files/789_14547.html' },
  { title: '人間失格', author: '太宰 治', url: 'https://www.aozora.gr.jp/cards/000035/files/301_14912.html' },
  { title: '斜陽', author: '太宰 治', url: 'https://www.aozora.gr.jp/cards/000035/files/1565_14882.html' },
  { title: '銀河鉄道の夜', author: '宮沢 賢治', url: 'https://www.aozora.gr.jp/cards/000081/files/43737_19007.html' },
  { title: '雨ニモマケズ', author: '宮沢 賢治', url: 'https://www.aozora.gr.jp/cards/000081/files/45630_23908.html' },
  { title: '羅生門', author: '芥川 龍之介', url: 'https://www.aozora.gr.jp/cards/000879/files/127_15260.html' },
  { title: '蜘蛛の糸', author: '芥川 龍之介', url: 'https://www.aozora.gr.jp/cards/000879/files/92_14545.html' },
  { title: '山月記', author: '中島 敦', url: 'https://www.aozora.gr.jp/cards/000622/files/1763_18901.html' },
  { title: '高瀬舟', author: '森 鴎外', url: 'https://www.aozora.gr.jp/cards/000129/files/691_15352.html' },
  { title: '舞姫', author: '森 鴎外', url: 'https://www.aozora.gr.jp/cards/000129/files/2078_15963.html' },
  { title: '学問のすすめ', author: '福沢 諭吉', url: 'https://www.aozora.gr.jp/cards/000296/files/47061_29420.html' },
  { title: 'ドグラ・マグラ', author: '夢野 久作', url: 'https://www.aozora.gr.jp/cards/000096/files/2093_28841.html' },
  { title: '蟹工船', author: '小林 多喜二', url: 'https://www.aozora.gr.jp/cards/000156/files/1465_16805.html' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// テキスト整形関数（横書き対応版）
async function fetchAndCleanText(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    const html = iconv.decode(response.data, 'Shift_JIS');

    let mainText = html.match(/<div class="main_text">([\s\S]*?)<\/div>/)?.[1];
    if (!mainText) mainText = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;

    mainText = mainText.replace(/<br\s*\/?>/gi, '\n');
    mainText = mainText.replace(/<ruby>(?:<rb>)?(.*?)(?:<\/rb>)?.*?<rt>(.*?)<\/rt>.*?<\/ruby>/g, '$1($2)');
    mainText = mainText.replace(/［＃.*?］/g, '');
    mainText = mainText.replace(/<[^>]+>/g, '');
    mainText = mainText.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    mainText = mainText.replace(/\n{3,}/g, '\n\n');

    return mainText.trim();
  } catch (error) {
    console.error(`Fetch Error (${url}):`, error.message);
    return null;
  }
}

async function run() {
  console.log('--- デイリー自動投稿ボット起動 ---');

  // 1. リストをシャッフル（ランダムにする）
  const shuffled = STOCK_LIST.sort(() => 0.5 - Math.random());

  // 2. 「まだ投稿していない作品」が見つかるまで探す
  for (const work of shuffled) {
    // 重複チェック
    const { data: existing } = await supabase
      .from('novels')
      .select('id')
      .eq('title', work.title)
      .eq('author_id', AUTHOR_ID)
      .maybeSingle();

    if (existing) {
      console.log(`[スキップ] 既に存在: ${work.title}`);
      continue; // 次の候補へ
    }

    console.log(`[ターゲット決定] 新規投稿: ${work.title} (${work.author})`);
    
    // 3. 本文を取得（GitHub Actionsならネットが繋がるので成功するはず！）
    const content = await fetchAndCleanText(work.url);
    
    if (!content) {
      console.log(`[エラー] 本文取得失敗のためスキップ`);
      continue;
    }

    const fullContent = `${content}\n\n----------\n著者：${work.author}\n底本：青空文庫（${work.url}）\nこの作品は著作権保護期間が満了しています。\n----------`;
    const fullDescription = `【著者：${work.author}】\n(底本：青空文庫)`;
    
    // 仮の表紙画像（タイトル入り）
    const coverUrl = `https://placehold.jp/30d/333/ffffff/300x400.png?text=${encodeURIComponent(work.title.substring(0, 10))}`;

    // 4. Supabaseに保存
    const { error } = await supabase.from('novels').insert({
      title: work.title,
      description: fullDescription,
      content: fullContent,
      price: 0,
      is_published: true,
      author_id: AUTHOR_ID,
      cover_image_url: coverUrl,
      // updated_at はカラムがないので削除済み
    });

    if (error) {
      console.error(`[保存失敗] ${error.message}`);
    } else {
      console.log(`[成功] ${work.title} を投稿しました！今日の仕事は終わりです。`);
      break; // 1つ投稿したらループを抜けて終了（1日1作にするため）
    }
  }
}

run();