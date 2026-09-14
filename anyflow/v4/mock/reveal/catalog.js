// All new layout sizes and scroll ranges are proposal values for this study.
export const concepts = [
 {id:'P1',group:'P',name:'中央から、二つの意味へ',brief:'二つのピクトが左右にほどけ、その下に説明が現れる。',steps:['ピクトに目を留める','左右へ開く','説明と実績を読む'],vh:420,mode:'split'},
 {id:'P2',group:'P',name:'図が上へ、言葉が下へ',brief:'大きな図が上に収まり、空いた場所に言葉が浮かび上がる。',steps:['大きなピクト','上へ収まる','下に説明'],vh:540,mode:'lift'},
 {id:'P3',group:'P',name:'図を残し、言葉を渡す',brief:'図を左に残し、見出しの一行目、二行目、本文へ視線を導く。',steps:['図を見せる','一行ずつ伝える','本文を読む'],vh:580,mode:'lines'},
 {id:'P4',group:'P',name:'ピクトから、横の景色へ',brief:'図から説明へ画面が広がり、次の価値へ横に進む。',steps:['ピクトが主役','横に説明が開く','次の価値へ'],vh:560,mode:'panorama'},
 {id:'P5',group:'P',name:'二つの図が、実績を囲む',brief:'ピクトが左右へ退くと、その間に大きな実績が現れる。',steps:['二つのピクト','中央に実績','図と意味を結ぶ'],vh:440,mode:'surround'},
 {id:'T1',group:'T',name:'言葉の余白に、図が現れる',brief:'まず大きな説明を読み、その隣にピクトが静かに現れる。',steps:['説明を読む','言葉が左へ収まる','図で理解する'],vh:540,mode:'explain'},
 {id:'T2',group:'T',name:'説明が上がり、図が立ち上がる',brief:'読んだ言葉が上へ移り、その下から図が立ち上がる。',steps:['言葉に注目','説明が上へ','ピクトが立ち上がる'],vh:540,mode:'rise'},
 {id:'T3',group:'T',name:'二つの言葉に、二つの図',brief:'SaaSとAIの説明を並べて読み、それぞれの図が順に加わる。',steps:['二つの説明','SaaSの図','AIの図と実績'],vh:440,mode:'pair'},
 {id:'T4',group:'T',name:'言葉を追い、図にたどり着く',brief:'文章を読んでから横へ進み、文章の隣で図に出会う。',steps:['文章を読む','横へ展開','ピクトにたどり着く'],vh:560,mode:'text-panorama'},
 {id:'T5',group:'T',name:'メッセージから、全体像へ',brief:'事業へのメッセージから始まり、二つの価値と実績が揃う。',steps:['メッセージ','二つの説明と図','実績で裏づける'],vh:460,mode:'overview'},
 {id:'R1',group:'R',name:'言葉から、三つの実績へ',brief:'見出しを大きく読ませ、三つの実績を順番に揃えてから価値へ。',steps:['大きな見出し','三つの実績','SaaSとAI'],vh:560,mode:'proof-sequence'},
 {id:'R2',group:'R',name:'一つずつ、実績を刻む',brief:'100+、20,000+、200+を一つずつ大きく見せ、最後に全体を揃える。',steps:['実績を一つずつ','三つを一覧で読む','価値へつなぐ'],vh:700,mode:'proof-chapters'},
 {id:'R3',group:'R',name:'実績を残して、価値を読む',brief:'大きく見せた実績を上に残し、下でSaaSとAIの意味を読む。',steps:['実績に注目','上に残す','説明をじっくり'],vh:580,mode:'proof-anchor'},
 {id:'R4',group:'R',name:'実績を道しるべに',brief:'実績が揃った後、左に残る数値を横目に図と説明を読み進める。',steps:['三つの実績','左の道しるべへ','図と説明を読む'],vh:580,mode:'proof-aside'},
 {id:'R5',group:'R',name:'数字から、ページがひらく',brief:'連携実績を大きく見せ、周囲に他の実績と二つの価値が広がる。',steps:['20,000+','実績が揃う','二つの価値が開く'],vh:480,mode:'proof-open'},
];
export const groups={P:{title:'ピクトから、理解へ。',lead:'まず図で目を留めて、言葉を読む。',label:'ピクト先行'},T:{title:'言葉から、イメージへ。',lead:'まず説明を読み、図で理解を深める。',label:'説明先行'},R:{title:'実績を、記憶に。',lead:'見出しと数値に、読むための時間をつくる。',label:'実績・熟読'}};
export const fallbackContent={head:'事業の推進力を、<em>Anyflow</em>が支えます。',values:[
 {tag:'for SaaS',title:['リアルタイムに','データ同期'],body:'外部サービスと自動でデータを同期（インポート/エクスポート）。自社データx外部データの掛け算により「データで戦うSaaS」へ。'},
 {tag:'for AI',title:['コンテキスト取得','から実行まで'],body:'AIの業務に必要な膨大なコンテキストを1つのツールで取得。さらに業務実行のためのアクションツールも豊富に提供。'}
],stats:[{label:'導入企業',number:'100+'},{label:'連携実績',number:'20,000+'},{label:'連携アプリ数',number:'200+'}]};
