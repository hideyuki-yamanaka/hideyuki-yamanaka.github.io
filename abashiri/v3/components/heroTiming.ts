/*
 * TOPページの登場演出のタイミング設定（共通パラメーター）
 *
 * ここの数値を変えるだけで各演出のタイミングを調整できる。
 * /mock/tune の調整パネルからも同じ構造でいじれる（※比較用の mock ページは 2026-09-26 に削除済み）。
 *
 * 時間はすべてミリ秒。
 */
export type HeroTiming = {
  /** ページを開いてから最初の演出が始まるまで（景色を見せる時間） */
  start: number;
  /** ヘッダー（ナビ） */
  header: {
    /** start からの追いディレイ */
    extraDelay: number;
  };
  /** 吹き出し＋「な〜んにもない」…… まとめて一枚のブラーで出現 */
  kotoba: {
    /** start からのディレイ */
    delay: number;
    duration: number;
    blur: number;
  };
  /** 「たまらない」のなぞり書き */
  tamaranai: {
    /** な〜んにもないの出現開始からのディレイ */
    delay: number;
    /** 出るのにかける時間（HeroBlurSeq のブラー出現） */
    duration: number;
  };
  /** 下の曲線のあしらい（「い」の書き始めと同時に走る） */
  flourish: {
    /** 「い」の書き始めからのオフセット（マイナスで早める） */
    offset: number;
  };
  /** 「ぼーっとしてみる」ボタン */
  button: {
    /** 書き終わりからの間 */
    gap: number;
    duration: number;
    blur: number;
  };
  /** 右下のイラスト＋たまんねーっ＋キラキラ（一番最後） */
  illust: {
    /** ボタン出現後の間 */
    gap: number;
    duration: number;
    blur: number;
  };
};

export const DEFAULT_HERO_TIMING: HeroTiming = {
  /* 【2026-10-29 ヒデさん「指定の箇所を早くしすぎた。もう少しゆっくりにした上で、最初のオブジェクトが出るタイミングを早めに」】
     しっぽ・たまらないを少し戻したぶん、最初の吹き出し＋な〜んにもない（と見出し・ヘッダー）を 500→200ms に早めた */
  start: 200,
  header: { extraDelay: 0 },
  kotoba: { delay: 300, duration: 1450, blur: 16 },
  /* 【2026-10-29 ヒデさん「たまらないも出るのをもうちょっと速く。全体的に3秒ぐらいで収まるように。人物が出てくるまで」】
     たまらないの出る時間 1100→800ms、ボタン 間150→100・出る時間1100→600ms（人物はボタンが出きってから出るので、ここも詰めた）
     同日「早くしすぎた。もう少しゆっくり」→ たまらない 800→950ms
     同日「たまらないと一緒にボタンも出すようにしましょう。その分詰められるかな」→ ボタンの間 100→0ms（たまらないと同じ瞬間に出る・人物もそのぶん早まる）
     同日「ほんのちょっとだけ早めに」→ たまらない 950→900ms。ここまでで「これでOK」（2026-10-29 決定） */
  tamaranai: { delay: 950, duration: 900 },
  flourish: { offset: 0 },
  button: { gap: 0, duration: 600, blur: 16 },
  illust: { gap: 250, duration: 1100, blur: 16 },
};

/** 部分的な上書きをデフォルトに重ねる */
export function mergeHeroTiming(partial?: Partial<HeroTiming> | null): HeroTiming {
  const d = DEFAULT_HERO_TIMING;
  if (!partial) return d;
  return {
    start: partial.start ?? d.start,
    header: { ...d.header, ...partial.header },
    kotoba: { ...d.kotoba, ...partial.kotoba },
    tamaranai: { ...d.tamaranai, ...partial.tamaranai },
    flourish: { ...d.flourish, ...partial.flourish },
    button: { ...d.button, ...partial.button },
    illust: { ...d.illust, ...partial.illust },
  };
}

/** /mock/tune の調整値の保存キー */
export const HERO_TIMING_STORAGE_KEY = "abashiri-hero-timing";
