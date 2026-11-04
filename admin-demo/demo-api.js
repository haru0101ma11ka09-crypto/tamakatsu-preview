/* Public UI demo only. No authentication or shared production data lives here.
 * The request/response shape follows the separate Python application's /api contract.
 */
(() => {
 'use strict';
 const KEY='tamakatsu:admin-demo:v1', SESSION=KEY+':session';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function initial(){return {mentors:clone(window.TAMA_DEMO_SEED).map(m=>({...m,version:1,updatedAt:0})),reviews:['mentor-01','mentor-01','mentor-02','mentor-03','mentor-04'].map((mid,i)=>({id:'demo-'+i,mentor_id:mid,name:'デモ利用者',stars:i%2?4:5,text:'【デモ】話を丁寧に聞いてもらえて、自分の強みを整理できました。',date:'2026-11-04',hidden:i===1?1:0,sample:1})),accounts:[{email:'admin@example.test',role:'admin',mentor_id:null,active:1},{email:'ryouga@example.test',role:'mentor',mentor_id:'mentor-01',active:1}],events:[]}}
 let data;
 try{data=JSON.parse(localStorage.getItem(KEY));if(!data||!Array.isArray(data.mentors)||!Array.isArray(data.accounts)||!Array.isArray(data.reviews)||!Array.isArray(data.events))data=initial()}catch{data=initial()}
 function user(){let email;try{email=sessionStorage.getItem(SESSION)}catch{}return data.accounts.find(a=>a.email===email&&a.active)}
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 function error(message,status=400){const e=new Error(message);e.status=status;throw e}
 function permit(mid){const u=user();if(u.role!=='admin'&&u.mentor_id!==mid)error('この操作を行う権限がありません。',403)}
 function admin(){if(user().role!=='admin')error('この操作を行う権限がありません。',403)}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{error('ブラウザーに保存できません。プライベートモードや保存容量を確認してください。画像は小さくしてお試しください。')}}
 function audit(action,target){data.events.unshift({id:Date.now(),actor:user().email,action,target,created_at:Math.floor(Date.now()/1000)});data.events=data.events.slice(0,50)}
 async function photoData(file){
  if(!(file instanceof File)||file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))error('JPEG・PNG・WebPの画像を選択してください（5MB以下）。');
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();image.src=url;await image.decode();
   if(image.naturalWidth*image.naturalHeight>20_000_000)error('画像は2000万画素以下にしてください。');
   const ratio=Math.min(1,800/image.naturalWidth,800/image.naturalHeight);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.8);
  }catch(e){if(e.status)throw e;error('画像を読み込めませんでした。別の画像をお試しください。')}finally{URL.revokeObjectURL(url)}
 }
 async function handle(path,options){
  const method=options.method||'GET';
  const body=typeof options.body==='string'?JSON.parse(options.body):options.body||{};
  if(path==='/api/config')return response({mode:'demo',googleReady:false,publicSite:'https://haru0101ma11ka09-crypto.github.io/tamakatsu-preview/'});
  if(path==='/api/demo/login'){
   const account=body.role==='admin'?'admin@example.test':body.role==='mentor'?'ryouga@example.test':null;
   if(!account)error('ロールを選択してください。');
   if(!data.accounts.some(a=>a.email===account&&a.active))error('デモアカウントは利用停止中です。管理者から有効にするかデモを初期化してください。',403);
   try{sessionStorage.setItem(SESSION,account)}catch{error('ブラウザーの保存機能が無効です。別のブラウザーでお試しください。')}
   return response({ok:true});
  }
  if(!user())error('ログインが必要です。',401);
  if(path==='/api/me')return response({...user(),mentorId:user().mentor_id,csrf:'public-demo-not-authentication'});
  if(path==='/api/logout'){sessionStorage.removeItem(SESSION);return response({ok:true})}
  if(path==='/api/mentors')return response({mentors:data.mentors.filter(m=>user().role==='admin'||m.id===user().mentor_id)});
  const profile=path.match(/^\/api\/mentors\/(mentor-\d{2})(\/photo)?$/);
  if(profile){
   const m=data.mentors.find(m=>m.id===profile[1]);if(!m)error('メンターが見つかりません。',404);permit(m.id);
   if(profile[2]&&method==='POST')m.photo=await photoData(body.get('photo'));
   else if(method==='PUT'){
    if(body.version!==m.version)error('ほかの画面で更新されています。再読み込みしてください。',409);
    for(const [key,max] of Object.entries({name:40,catch:60,theme:120,bio:5000,style:2000})){
     if(typeof body[key]!=='string'||body[key].trim().length>max||(key==='name'&&!body[key].trim()))error(key+'の入力を確認してください。');
    }
    if(!/^[AD][CS][TI][GP]$/.test(body.type))error('診断タイプを確認してください。');
    for(const [key,[count,max]] of Object.entries({features:[3,40],topics:[12,60],recommend:[8,200]})){
     if(!Array.isArray(body[key])||body[key].length>count||body[key].some(v=>typeof v!=='string'||!v.trim()||v.length>max))error(key+'の入力数・文字数を確認してください。');
    }
    if(!Array.isArray(body.career)||body.career.length>8||body.career.some(c=>!['industry','job','status'].includes(c.kind)||typeof c.label!=='string'||!c.label.trim()||c.label.length>60))error('業種・職種の入力を確認してください。');
    for(const key of ['name','catch','theme','bio','style','type','features','topics','recommend','career'])m[key]=clone(body[key]);
   }else error('対応していない操作です。',405);
   m.version++;m.updatedAt=Math.floor(Date.now()/1000);audit(profile[2]?'photo.update':'profile.update',m.id);save();return response({ok:true});
  }
  if(path==='/api/reviews')return response({reviews:data.reviews.filter(r=>user().role==='admin'||r.mentor_id===user().mentor_id)});
  const review=path.match(/^\/api\/reviews\/(demo-\d+)$/);
  if(review&&method==='PATCH'){
   const r=data.reviews.find(r=>r.id===review[1]);if(!r)error('レビューが見つかりません。',404);permit(r.mentor_id);
   if(typeof body.hidden!=='boolean')error('表示状態を指定してください。');
   r.hidden=+body.hidden;audit(r.hidden?'review.hide':'review.show',r.id);save();return response({ok:true});
  }
  if(path==='/api/accounts'){
   admin();
   if(method==='GET')return response({accounts:data.accounts});
   if(method!=='POST')error('対応していない操作です。',405);
   const email=String(body.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)error('メールアドレスを確認してください。');
   if(!['admin','mentor'].includes(body.role)||typeof body.active!=='boolean')error('権限を確認してください。');
   if(body.role==='mentor'&&!data.mentors.some(m=>m.id===body.mentor_id))error('担当メンターを選択してください。');
   if(email===user().email&&(body.role!=='admin'||!body.active))error('自分の管理者権限は解除できません。');
   let a=data.accounts.find(a=>a.email===email);if(!a){a={email};data.accounts.push(a)}
   Object.assign(a,{role:body.role,mentor_id:body.role==='mentor'?body.mentor_id:null,active:+body.active});audit('account.update',email);save();return response({ok:true});
  }
  if(path==='/api/audit'){admin();return response({events:data.events})}
  error('デモに対応していない操作です。',404);
 }
 window.TamaDemo={
  async request(path,options={}){const before=clone(data);try{return await handle(path,options)}catch(e){data=before;return response({error:e.message||'操作に失敗しました。'},e.status||400)}},
  reset(){localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION);data=initial()}
 };
})();
