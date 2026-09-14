/*
 * 作字（吹き出し＋な〜んにもない → しっぽ → たまらない）の登場のパラメーター
 * （2026-08-21 ヒデさん指示）
 *
 * ・吹き出しと「な〜んにもない」は一括でブラー出現（以前は吹き出しが先だった）
 * ・その後、しっぽがにゅーっと伸びる
 * ・伸びきってから「たまらない」が出る
 * ・出だしのブラーは弱め（以前の16pxから9pxへ）
 *
 * 数値は調整パネル「作字｜登場のしかた」から触れる。
 */
export type HeroEnter = {
  /** 出だしのブラーの強さ(px)。以前は16。弱めが既定 */
  blur: number;
  /** 吹き出し＋な〜んにもない が出るのにかける時間(ms) */
  duration: number;
  /** しっぽが伸びきってから「たまらない」が出るまでの間(ms) */
  tamaGap: number;
};

export const DEFAULT_HERO_ENTER: HeroEnter = {
  blur: 9,
  duration: 1450,
  tamaGap: 100,
};

export function mergeHeroEnter(partial?: Partial<HeroEnter> | null): HeroEnter {
  return { ...DEFAULT_HERO_ENTER, ...partial };
}
