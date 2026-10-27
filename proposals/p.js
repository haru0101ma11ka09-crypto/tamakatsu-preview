// 案プレビュー用：「？」で4軸の説明を開く（実装時は既存 index.html の trait-help 処理を維持）
const TRAIT={
 0:{n:'行動',t:'即応タイプ',b:'気になることをすぐ行動に移し、試しながら学びを深める傾向があります。迷う場面でも、まず小さく動いて確かめられることが強みです。',h:'説明会やインターンで、若手が提案できる場面を聞いてみましょう。'},
 1:{n:'環境',t:'挑戦タイプ',b:'前例のない場面や変化の大きい環境で、やる気が高まる傾向があります。',h:'新規事業や役割の変化が多い職場かどうかを、説明会で確かめてみましょう。'},
 2:{n:'関係',t:'協働タイプ',b:'意見を出し合い、仲間と一緒に進めることで力を発揮する傾向があります。',h:'チームでの進め方や、対話の機会が多い職場かどうかを聞いてみましょう。'},
 3:{n:'価値観',t:'社会貢献タイプ',b:'誰かの役に立つ実感が、いちばんの原動力になる傾向があります。',h:'事業が誰のどんな課題を解決しているのかを、企業研究で確かめてみましょう。'}
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-help]');if(!b)return;
 const i=b.dataset.help,t=TRAIT[i],p=b.dataset.pct;
 const d=document.createElement('dialog');d.className='sheet';
 d.innerHTML=`<p class="eyebrow">${t.n}の傾向</p><h2>${p}% ${t.t}</h2><p>${t.b}</p><h3>企業選びのヒント</h3><p>${t.h}</p><small>割合は回答から算出した傾向の目安です。50%に近いほど両方の特徴があります。</small><button class="close" type="button">閉じる</button>`;
 document.body.append(d);d.showModal();
 d.addEventListener('click',ev=>{if(ev.target===d||ev.target.closest('.close'))d.close()});
 d.addEventListener('close',()=>d.remove());
});
