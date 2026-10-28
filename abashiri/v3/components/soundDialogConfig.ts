/*
 * 最初の「網走の環境音を楽しむことができます。再生しますか？」の窓（SoundUi.tsx）の見せ方の案
 *
 * 【2026-10-28 ヒデさん指示】
 *   「一番最初のサウンドのオンオフのUIをもう少しブラッシュアップして、今回のサイトの世界観に合うように。3案ほど。
 *     抜け感があり、上品でゆったりした印象を与えられると望ましい。キービジュアルの世界観に合わせられると望ましい」
 *   → キービジュアルの「ぼーっとしてみる」のボタン（白10%のすりガラス・白40%の細い縁・後ろを強くぼかす・白い文字）を土台に3案。
 *     文言はそのまま（足さない）。今の白いカードは「現行」として残す
 *   選び方：調整パネル › サイト共通 › バリエーション › 環境音（BGM）› 最初の確認の窓（押すと、その場で窓を出し直す）
 *   値は CSS 変数 --sound-dlg（TopTunePanel が書く・SoundUi の useSoundDlg が読む）
 */
export const SOUND_DLG_VARIANTS: Record<number, { name: string; note: string; fixed?: boolean }> = {
  0: { name: "白いカード", note: "いまの形。白90%のカード・青いONボタン・文字だけのOFF", fixed: true },
  1: { name: "ガラスのカード", note: "カードごと、ぼーっとしてみるのボタンと同じすりガラスに。白い細い文字。ONは少し明るいガラスのピル、OFFは文字だけ" },
  2: { name: "言葉だけ", note: "カードを無くして、ぼかした景色の上に言葉とボタンだけを浮かべる。いちばん抜け感がある。ON／OFF とも音の波のアイコン付きのガラスのピル" },
  3: { name: "白い霞のカード", note: "白70%の霞のようなすりガラスのカード。文字は濃い灰色の細字、ONは送りボタンと同じ青いふちのガラス、OFFは文字だけ" },
};
/** 既定＝案2 言葉だけ（2026-10-28 ヒデさん「案2の言葉だけでいきましょう。ただ、文字がちょっと弱々しく見にくいので、フォントウェイトやラインハイト、1行目、2行目のギャップなどを変えられる調整パネルを。背景のブラーの具合も変えられるように。もうちょっときつくして」）。
    値の住み家：ここ／TopTunePanel の DEFAULTS（sound.dialog）／tune-defaults.json／globals.css の --sound-dlg（4つとも同じ値） */
export const SOUND_DLG_DEFAULT = 2;
/** 調整パネルで案を押した時に、窓を出し直す合図 */
export const SOUND_DLG_PREVIEW_EVENT = "abashiri:sound-dialog-preview";
/** 窓が出た合図（調整パネルが文字の行を当て直す。窓は出るたびに作り直されるため） */
export const SOUND_DLG_SHOWN_EVENT = "abashiri:sound-dialog-shown";
