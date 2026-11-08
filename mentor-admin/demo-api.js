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
 for(const m of data.mentors){if(!Object.hasOwn(m,'ownerEmail')){const owners=data.accounts.filter(a=>a.mentor_id===m.id&&a.active);m.ownerEmail=owners.length===1?owners[0].email:''}}
 function user(){let email;try{email=sessionStorage.getItem(SESSION)}catch{}return data.accounts.find(a=>a.email===email&&a.active)}
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 function error(message,status=400){const e=new Error(message);e.status=status;throw e}
 function permit(mid,moderation=false){const u=user();if(data.mentors.find(m=>m.id===mid)?.ownerEmail!==u.email&&!(moderation&&u.role==='admin'))error('紐づけられたアカウントだけが編集できます。',403)}
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
  if(path==='/api/demo/accounts')return response({accounts:data.accounts.filter(a=>a.active).map(a=>({email:a.email,role:a.role}))});
  if(path==='/api/demo/login'){
   const account=body.email||(body.role==='admin'?'admin@example.test':body.role==='mentor'?'ryouga@example.test':null);
   if(!account)error('ロールを選択してください。');
   if(!data.accounts.some(a=>a.email===account&&a.active))error('デモアカウントは利用停止中です。管理者から有効にするかデモを初期化してください。',403);
   try{sessionStorage.setItem(SESSION,account)}catch{error('ブラウザーの保存機能が無効です。別のブラウザーでお試しください。')}
   return response({ok:true});
  }
  if(!user())error('ログインが必要です。',401);
  if(path==='/api/me')return response({...user(),mentorId:user().mentor_id,csrf:'public-demo-not-authentication'});
  if(path==='/api/logout'){sessionStorage.removeItem(SESSION);return response({ok:true})}
  if(!Array.isArray(data.students))data.students=[['sample-student-1','mentor-01','サンプル学生 A','new'],['sample-student-2','mentor-01','サンプル学生 B','scheduled'],['sample-student-3','mentor-02','サンプル学生 C','supporting']].map(([id,mentorId,name,status])=>({id,mentorId,name,status,email:'',phone:'',university:'サンプル大学',graduation:'2027',diagnosis:'ACTG',selectedAt:'2026-11-05',nextActionAt:'',notes:'【確認用サンプル】実在する学生の情報ではありません。',version:1,updatedAt:0,events:[]}));
  function studentAllowed(mid){permit(mid,true)}
  function studentValues(input){
   const out={};for(const [key,max] of Object.entries({name:80,email:254,phone:40,university:120,graduation:4,diagnosis:4,selectedAt:10,nextActionAt:10,notes:5000})){const value=input[key]??'';if(typeof value!=='string'||value.trim().length>max)error('入力内容の文字数を確認してください。');out[key]=value.trim()}
   out.email=out.email.toLowerCase();if(!out.name)error('学生名を入力してください。');if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))error('メールアドレスを確認してください。');if(out.graduation&&!/^20\d{2}$/.test(out.graduation))error('卒業年は西暦4桁で入力してください。');if(out.diagnosis&&!/^[AD][CS][TI][GP]$/.test(out.diagnosis))error('診断タイプを確認してください。');
   for(const k of ['selectedAt','nextActionAt'])if(out[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(out[k])||!Number.isFinite(Date.parse(out[k]))||new Date(out[k]).toISOString().slice(0,10)!==out[k]))error('日付を確認してください。');
   out.status=input.status||'new';if(!['new','contacted','scheduled','interviewed','supporting','completed','closed'].includes(out.status))error('進捗を確認してください。');return out;
  }
  if(path==='/api/students'&&method==='GET')return response({students:data.students.filter(s=>user().role==='admin'||data.mentors.find(m=>m.id===s.mentorId)?.ownerEmail===user().email).map(({events,...s})=>s)});
  if(path==='/api/students'&&method==='POST'){
   const mid=body.mentorId;if(!data.mentors.some(m=>m.id===mid))error('担当メンターを選択してください。');studentAllowed(mid);const value=studentValues(body);
   if(value.email&&data.students.some(s=>s.mentorId===mid&&s.email===value.email))error('このメールアドレスの学生は登録済みです。',409);
   const id='student-'+crypto.randomUUID(),at=Math.floor(Date.now()/1000);data.students.unshift({...value,id,mentorId:mid,version:1,updatedAt:at,events:[{...value,actor:user().email,at}]});audit('student.create',id);save();return response({ok:true,id},201);
  }
  const student=path.match(/^\/api\/students\/([a-zA-Z0-9-]+)$/);
  if(student){
   const s=data.students.find(s=>s.id===student[1]);if(!s)error('学生が見つかりません。',404);studentAllowed(s.mentorId);
   if(method==='GET'){const {events,...value}=s;return response({student:value,events:s.events||[]})}
   if(method!=='PUT')error('対応していない操作です。',405);if(body.version!==s.version)error('ほかの画面で更新されています。再読み込みしてください。',409);if(body.mentorId&&body.mentorId!==s.mentorId)error('担当メンターはこの画面から変更できません。');const value=studentValues(body);
   if(value.email&&data.students.some(other=>other.id!==s.id&&other.mentorId===s.mentorId&&other.email===value.email))error('同じメールアドレスの学生が登録されています。',409);
   Object.assign(s,value);s.version++;s.updatedAt=Math.floor(Date.now()/1000);(s.events??=[]).unshift({...value,actor:user().email,at:s.updatedAt});audit('student.update',s.id);save();return response({ok:true});
  }
  if(path==='/api/mentors'&&method==='GET')return response({mentors:data.mentors.map(m=>{const value=clone(m);value.canEdit=m.ownerEmail===user().email;if(user().role!=='admin'&&!value.canEdit)delete value.ownerEmail;return value})});
  const emailValid=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  function invite(email){const a=data.accounts.find(a=>a.email===email);if(a&&!a.active)error('利用停止中のアカウントです。先に有効にしてください。');if(!a)data.accounts.push({email,role:'mentor',mentor_id:null,active:1})}
  if(path==='/api/mentors'&&method==='POST'){
   admin();if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>40||!emailValid(body.ownerEmail))error('表示名とGoogleメールアドレスを確認してください。');
   const ownerEmail=body.ownerEmail.toLowerCase().trim();invite(ownerEmail);const number=Math.max(0,...data.mentors.map(m=>Number(m.id.slice(7))||0))+1;const id='mentor-'+String(number).padStart(2,'0');
   data.mentors.push({id,no:String(number).padStart(2,'0'),name:body.name.trim(),ownerEmail,photo:'./photos/placeholder.svg',type:'ACTG',catch:'',theme:'',bio:'',style:'',features:[],topics:[],recommend:[],career:[],samples:[],reviews:[],version:1,updatedAt:Math.floor(Date.now()/1000)});
   audit('mentor.create',id);save();return response({ok:true,id},201);
  }
  const ownership=path.match(/^\/api\/mentors\/(mentor-\d+)\/owner$/);
  if(ownership&&method==='PUT'){
   admin();const m=data.mentors.find(m=>m.id===ownership[1]);if(!m)error('メンターが見つかりません。',404);if(body.version!==m.version)error('ほかの画面で更新されています。再読み込みしてください。',409);if(!emailValid(body.ownerEmail))error('Googleメールアドレスを確認してください。');
   const email=body.ownerEmail.toLowerCase().trim();invite(email);m.ownerEmail=email;m.version++;m.updatedAt=Math.floor(Date.now()/1000);audit('mentor.owner',m.id);save();return response({ok:true});
  }
  const profile=path.match(/^\/api\/mentors\/(mentor-\d+)(\/photo)?$/);
  if(profile){
   const m=data.mentors.find(m=>m.id===profile[1]);if(!m)error('メンターが見つかりません。',404);permit(m.id);
   if(profile[2]&&method==='POST'){
    const version=m.version;const photo=await photoData(body.get('photo'));reload();permit(profile[1]);const current=data.mentors.find(v=>v.id===profile[1]);if(current.version!==version)error('プロフィールが更新されています。再読み込みしてください。',409);current.photo=photo;current.version++;current.updatedAt=Math.floor(Date.now()/1000);audit('photo.update',current.id);save();return response({ok:true});
   }
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
    if(body.university!==undefined&&(typeof body.university!=='string'||body.university.trim().length>40))error('出身学校の入力を確認してください。');
    if(body.plans!==undefined&&(!Array.isArray(body.plans)||body.plans.length>3||body.plans.some(p=>!p||typeof p.title!=='string'||!p.title.trim()||p.title.length>50||typeof p.text!=='string'||p.text.length>200||typeof p.duration!=='string'||p.duration.length>20)))error('面談プランの入力数・文字数を確認してください。');
    for(const key of ['name','catch','theme','bio','style','type','features','topics','recommend','career'])m[key]=clone(body[key]);
    m.university=typeof body.university==='string'?body.university.trim():(m.university||'');
    if(Array.isArray(body.plans))m.plans=body.plans.map(p=>({title:p.title.trim(),text:p.text.trim(),duration:p.duration.trim(),place:'オンライン',image:''}));
   }else error('対応していない操作です。',405);
   m.version++;m.updatedAt=Math.floor(Date.now()/1000);audit(profile[2]?'photo.update':'profile.update',m.id);save();return response({ok:true});
  }
  if(path==='/api/reviews')return response({reviews:data.reviews.filter(r=>user().role==='admin'||data.mentors.find(m=>m.id===r.mentor_id)?.ownerEmail===user().email)});
  const review=path.match(/^\/api\/reviews\/(demo-\d+)$/);
  if(review&&method==='PATCH'){
   const r=data.reviews.find(r=>r.id===review[1]);if(!r)error('レビューが見つかりません。',404);permit(r.mentor_id,true);
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
   if(email===user().email&&(body.role!=='admin'||!body.active))error('自分の管理者権限は解除できません。');
   let a=data.accounts.find(a=>a.email===email);if(!a){a={email};data.accounts.push(a)}
   Object.assign(a,{role:body.role,active:+body.active});audit('account.update',email);save();return response({ok:true});
  }
  if(path==='/api/audit'){admin();return response({events:data.events})}
  error('デモに対応していない操作です。',404);
 }
 function reload(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.mentors)&&Array.isArray(saved.accounts)&&Array.isArray(saved.reviews)&&Array.isArray(saved.events)){data=saved;for(const m of data.mentors){if(!Object.hasOwn(m,'ownerEmail')){const owners=data.accounts.filter(a=>a.mentor_id===m.id&&a.active);m.ownerEmail=owners.length===1?owners[0].email:''}}}}catch{}}
 window.TamaDemo={
  async request(path,options={}){reload();const before=clone(data);try{return await handle(path,options)}catch(e){data=before;return response({error:e.message||'操作に失敗しました。'},e.status||400)}},
  reset(){localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION);data=initial()}
 };
})();
