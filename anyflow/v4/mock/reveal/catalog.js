// IDs are stable URL/storage keys. Display numbers follow the catalog order.
export const concepts = [
 {id:'02',preview:.045,entry:0,name:'余白から現れ、左へ収まる',brief:'空白から図と見出しが現れ、図が左へ収まる。余白を下へ抜けてAIでも繰り返す。',mode:'document',layout:'staged'},
 {id:'03',preview:.42,name:'見出しを綴り、本文が現れる',brief:'所定の位置で自動タイピング。スクロールを止めても打ち終わり、本文のブラーがほどける。',steps:['実績に目を留める','見出しをタイピング','本文がブラーから現れる'],vh:640,mode:'trigger-typing'},
 {id:'04',preview:.02,name:'数字を、信頼の起点に',brief:'20,000+を大きく見せ、三つの実績へ収めてから図へ続く。',mode:'document',layout:'proof'},
 {id:'05',preview:.14,name:'図から、言葉が広がる',brief:'中央の大きなピクトが上へ収まり、その下へ言葉が広がる。',mode:'document',layout:'center'},
 {id:'09',preview:.32,entry:0,name:'大きな図を収め、横へつなぐ',brief:'図をズームアウトして本文へ誘導。読める区間を経てSaaSからAIへ横移動し、AIの図も収まる。',steps:['実績が収まる','図から説明へ','横に次の価値へ'],vh:680,mode:'zoom-horizontal'},
 {id:'10',preview:.54,entry:0,name:'全景へ引き、次の価値へ',brief:'大きな実績から説明へ。用途間の横移動時に全景を少し引き、前後の関係を見せて次へ寄る。',steps:['大きな実績','図と説明を読む','引いて横へ渡す'],vh:650,mode:'overview-horizontal'},
 {id:'11',preview:.02,entry:0,name:'用途名から、下へ読み進める',brief:'大きな用途名が小見出しへ収まり、図と説明が現れる。次の用途へは通常の縦スクロール。',mode:'document',layout:'title'},
 {id:'12',preview:.06,entry:0,name:'大見出しが、説明の起点に',brief:'中央の用途名を右の説明の冒頭へ。空いた左側に図が現れ、見出しと本文へ続く。',steps:['用途名に注目','右の小見出しへ','図と説明を読む'],vh:610,mode:'title-dock'},
 {id:'13',preview:.12,entry:0,name:'用途名を、横へ受け渡す',brief:'大きな用途名が図と本文の見出しに収まり、横スクロールで次の大きな用途名へ。',steps:['用途名に注目','図と説明を読む','横に次の用途へ'],vh:660,mode:'title-horizontal'},
 {id:'14',preview:.34,entry:0,name:'用途名を上へ、図を中央へ',brief:'大きな用途名が中央上部へ収まり、図、その下の説明へと視線を下へ渡す。',steps:['大きな用途名','中央の図','下の説明へ'],vh:610,mode:'title-stack'},
 {id:'15',preview:.34,entry:0,name:'用途名を残し、言葉を迎える',brief:'大きな用途名を左上へ収め、右に図、左に説明を迎える。用途名が読む位置を示す。',steps:['用途名に注目','左上の目印へ','言葉と図を迎える'],vh:610,mode:'title-editorial'},
 {id:'16',preview:0,entry:0,name:'ピクトが語る二つの価値',brief:'初回のピクト主役案を復元。左右の大きな図から、その下の用途名・説明へ。実績は下部の帯で支える。',mode:'restored-picto'},
 {id:'17',preview:0,entry:0,name:'メッセージを残す縦読み',brief:'初回No.07を復元。左にメッセージと実績を残し、右のSaaS・AIを順に読み進める。',mode:'restored-reading'},
 {id:'18',preview:0,entry:0,name:'20,000を主役に',brief:'2回目No.03を追加。大きな20,000+と右の2指標から、下のSaaS・AIへ読み進める。',mode:'restored-number'},
 {id:'19',preview:.64,entry:0,name:'二つの図が、読む余白をひらく',brief:'大きな2つの図が左右の定位置へ。SaaS、AIの順に本文を迎え、最後に実績を読む。',mode:'attention-duet'},
 {id:'20',preview:.55,entry:0,name:'大きな実績を、読む目印に',brief:'20,000+を左の目印として残し、右の図と説明を縦に読み進める。',mode:'attention-ledger'},
 {id:'21',preview:.60,entry:0,name:'見出しの行間に、図が現れる',brief:'2行の見出しが上下へ開き、その間にピクトが現れる。文章と図の距離で視線をつなぐ。',mode:'attention-linegap'},
 {id:'22',preview:.28,entry:0,name:'横へ渡し、言葉を綴る',brief:'横移動の到着後に見出しを自動タイピング。本文を読む間を取ってから次の用途へ。',mode:'attention-horizontal'},
 {id:'23',preview:.78,entry:0,name:'数字から、二つの価値をひらく',brief:'巨大な20,000+が3つの実績へ収まり、下にSaaS・AIの全体像が順に開く。',mode:'attention-number'},
 {id:'24',preview:.58,entry:0,name:'視野を広げて、意味を迎える',brief:'細い窓から見える図が、スクロールで全体を現す。輪郭を追ったあとに本文へ。',mode:'attention-aperture'},
 {id:'25',preview:.58,entry:0,name:'読む面が、正面を向く',brief:'少し傾いた面がスクロールで正面に起き上がる。落ち着いてから本文を読む。',mode:'attention-tilt'},
 {id:'26',preview:.58,entry:0,name:'図から言葉へ、焦点を渡す',brief:'大きな図に目を留めたあと、図が引き、本文のブラーがほどける。',mode:'attention-focus'},
 {id:'27',preview:.58,entry:0,name:'中央の軸を、下へたどる',brief:'中央の細い線を読書の目印に、図と説明を左右交互にたどる。',mode:'attention-path'},
 {id:'28',preview:.22,entry:0,name:'奥行きで、主役を受け渡す',brief:'読み終えた用途が奥へ引き、次の用途が手前の正面へ。読める距離で長く留める。',mode:'attention-depth'},
].map((c,index)=>({...c,number:String(index+1).padStart(2,'0'),label:`No.${String(index+1).padStart(2,'0')}`}));
export const fallbackContent={head:'事業の推進力を、<em>Anyflow</em>が支えます。',values:[
 {tag:'for SaaS',title:['リアルタイムに','データ同期'],body:'外部サービスと自動でデータを同期（インポート/エクスポート）。自社データx外部データの掛け算により「データで戦うSaaS」へ。'},
 {tag:'for AI',title:['コンテキスト取得','から実行まで'],body:'AIの業務に必要な膨大なコンテキストを1つのツールで取得。さらに業務実行のためのアクションツールも豊富に提供。'}
],stats:[{label:'導入企業',number:'100+'},{label:'連携実績',number:'20,000+'},{label:'連携アプリ数',number:'200+'}]};
// Removed proposal IDs are deliberately not reused.
const legacyIds={P3:'02',TY1:'03'};
export const resolveConcept=id=>concepts.find(c=>c.id===(legacyIds[id]||id));
