/* 日本語を「文節」で改行する（iPhoneのSafariなど、word-break:auto-phrase に未対応のブラウザ用）。
   Chrome など対応済みのブラウザでは、何もしない。 */
(function(){
  if(window.CSS&&CSS.supports&&CSS.supports('word-break','auto-phrase'))return;
  if(typeof window.budouxParse!=='function')return;
  document.documentElement.classList.add('phrase-wrap');
  var SKIP='script,style,textarea,input,select,option,code,pre,svg,.no-phrase';
  var JA=/[぀-ヿ㐀-鿿]/;
  var done=new WeakSet();
  function wrap(n){
    if(done.has(n))return;done.add(n);
    var t=n.nodeValue;if(!t||t.length<6||!JA.test(t))return;
    var parts=window.budouxParse(t);if(parts.length<2)return;
    var f=document.createDocumentFragment();
    parts.forEach(function(p,i){var tn=document.createTextNode(p);done.add(tn);f.appendChild(tn);if(i<parts.length-1)f.appendChild(document.createElement('wbr'));});
    n.parentNode.replaceChild(f,n);
  }
  function walk(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentElement;if(!p||done.has(n)||p.closest(SKIP))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    var list=[];while(w.nextNode())list.push(w.currentNode);list.forEach(wrap);
  }
  var app=document.getElementById('app')||document.body,pending=false;
  var obs=new MutationObserver(function(){
    if(pending)return;pending=true;
    requestAnimationFrame(function(){pending=false;obs.disconnect();walk(app);obs.observe(app,{childList:true,subtree:true});});
  });
  walk(app);obs.observe(app,{childList:true,subtree:true});
})();
