/*
 * ぼーっとスポット詳細ページのデータ（CMS のつもりで持つ・V3.0）
 *
 * 将来 CMS に載せ替える前提のテンプレ構造。1スポット＝1レコードで、
 * ページ側（SpotDetailPage）はこの型しか知らない。
 *
 * 能取岬の文言は網走市観光公式サイト
 * https://visit-abashiri.jp/scenery/b1b92ba8835b04de0cdaf87843cb6d0769a68f3d.html
 * から取得（2026-09-14）。
 */

export type SpotDetailSection = {
  /** 小見出し（無ければ本文だけの段落） */
  heading?: string;
  text: string;
};

export type SpotDetail = {
  slug: string;
  /** 一覧と同じ通し番号（「ぼーっとスポット 01」） */
  no: string;
  category: string;
  name: string;
  kana: string;
  /** 1行のリード（ヒーローに重ねる） */
  lead: string;
  /** ヒーロー写真と、本文中で使う写真 */
  hero: string;
  photos: string[];
  sections: SpotDetailSection[];
  /** 担当者からのおすすめポイント */
  points: string[];
  /** 基本情報（表） */
  info: { label: string; value: string }[];
  /** 周辺マップ（Googleマップ検索語と外部リンク）。公式サイトの「周辺マップ」に相当 */
  map: { query: string; link: string };
};

export const SPOT_DETAILS: Record<string, SpotDetail> = {
  notoro: {
    slug: "notoro",
    no: "01",
    category: "ぼーっとスポット",
    name: "能取岬",
    kana: "のとろみさき",
    lead: "網走市美岬、オホーツク海に突き出た岬。",
    hero: "/img/scene-notoro.jpg",
    photos: ["/img/spot-notoro.jpg", "/img/bg-hero.jpg"],
    sections: [
      {
        text: "オホーツク海に突き出た岬で、突端には灯台と管理事務所があるだけ。ここから西方は能取湖と常呂町の海岸、北方はすべてオホーツク海、東方は遠く知床連山が眺められます。冬は網走市で最も早く流氷を見ることができ、眺望は最高です。冬は防寒対策を忘れずに。",
      },
      {
        heading: "夜の能取岬",
        text: "1年を通して夜は真っ暗になるので、天気が良い日は星を撮影するベストスポットとなります。日によっては流れ星も多く観測することができます。移動中に足元を照らすライトの装備があると安心です。ただし、キタキツネやエゾシカなどの野生動物が多く出没するため、ご注意ください。",
      },
      {
        heading: "能取岬灯台について",
        text: "高さは地上から21m、海面上から57mとなっている灯台は、毎8秒に1閃光の光り方をしており、その光は約36kmまで到達します。この灯台、初めて点灯したのは1917年（大正6年）。鉄筋コンクリート造の灯台としては、北海道で一番古いもので、1世紀以上にわたり、光続けております。",
      },
    ],
    points: [
      "「のとろ」という読み方は、アイヌ語で“岬のところ”を意味する“ノッ・オロ”に由来します。",
      "トヨタプリウスのCMや映画『子ぎつねヘレン』『南極料理人』『狙った恋の落とし方』などのロケ地としても有名です。",
      "2025年12月に「願いを叶える鐘」「ホタテ貝の絵馬」が設置され、人気の観光スポットになっています。",
    ],
    info: [
      { label: "住所", value: "〒093-0087 北海道網走市美岬" },
      {
        label: "営業時間",
        value:
          "公衆トイレ開設時間\n4月〜10月：午前8時から午後5時\n11月〜3月：午前9時から午後4時\n※開設時間以外は水が使用できないため、トイレの利用はご遠慮ください。",
      },
      {
        label: "アクセス",
        value: "車：網走市の中心市街地から20分程\n最寄り駅：JR網走駅",
      },
      { label: "駐車場", value: "あり" },
      {
        label: "お問い合わせ",
        value: "0152-44-5849（一般社団法人 網走市観光協会）",
      },
    ],
    map: {
      query: "能取岬",
      link: "https://maps.google.com/?q=%E8%83%BD%E5%8F%96%E5%B2%AC",
    },
  },
};
