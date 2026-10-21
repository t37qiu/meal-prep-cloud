const SUPABASE_URL="https://vbsjniigihhlcoialwdg.supabase.co";
const SUPABASE_KEY=window.SUPABASE_KEY;
let cloudAccessToken=null;
let cloudRefreshToken=null;
let cloudUserId=null;
let cloudReady=false;
let cloudSaveTimer=null;
let cloudIsRestoring=false;

function setCloudStatus(text,state="warn"){
  const el=document.getElementById("cloudStatus");
  if(!el) return;
  el.textContent="Cloud: "+text;
  el.classList.remove("cloud-ok","cloud-warn","cloud-bad");
  el.classList.add(state==="ok"?"cloud-ok":state==="bad"?"cloud-bad":"cloud-warn");
}
function setCloudAuthButton(){ const b=document.getElementById("cloudAuthBtn"); if(b) b.textContent=cloudReady?"Sign Out":"Sign In"; }
function cloudHeaders(extra={}){ const h={apikey:SUPABASE_KEY,...extra}; if(cloudAccessToken) h.Authorization="Bearer "+cloudAccessToken; return h; }
function saveCloudSession(session){
  cloudAccessToken=session?.access_token||null; cloudRefreshToken=session?.refresh_token||null; cloudUserId=session?.user?.id||null; cloudReady=!!(cloudAccessToken&&cloudUserId);
  try{ if(cloudReady) localStorage.setItem("mealPrepCloudSession",JSON.stringify({access_token:cloudAccessToken,refresh_token:cloudRefreshToken,user:{id:cloudUserId,email:session?.user?.email||""}})); else localStorage.removeItem("mealPrepCloudSession"); }catch(e){}
  setCloudAuthButton();
}
function loadStoredCloudSession(){
  try{ const x=JSON.parse(localStorage.getItem("mealPrepCloudSession")||"null"); if(x?.access_token&&x?.user?.id){ cloudAccessToken=x.access_token; cloudRefreshToken=x.refresh_token||null; cloudUserId=x.user.id; cloudReady=true; setCloudAuthButton(); return true; } }catch(e){}
  return false;
}
async function supabaseAuth(path,body){
  const r=await fetch(SUPABASE_URL+path,{method:"POST",headers:cloudHeaders({"Content-Type":"application/json"}),body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.msg||data.message||data.error_description||data.error||("HTTP "+r.status)); return data;
}
async function cloudSignUp(){
  const email=document.getElementById("cloudEmail").value.trim(), password=document.getElementById("cloudPassword").value, err=document.getElementById("cloudAuthError"); err.textContent="";
  if(!email||password.length<6){err.textContent="Enter an email and a password with at least 6 characters.";return;}
  try{ setCloudStatus("creating account…","warn"); const data=await supabaseAuth("/auth/v1/signup",{email,password}); if(data.access_token){ saveCloudSession(data); closeModal("cloudAuthModal"); await startCloudForSignedInUser(); } else { setCloudStatus("verify email","warn"); err.textContent="Account created. Check your email if Supabase asks you to confirm it, then come back and Sign In."; } }catch(e){err.textContent=e.message;setCloudStatus("sign-up error","bad");}
}
async function cloudSignIn(){
  const email=document.getElementById("cloudEmail").value.trim(), password=document.getElementById("cloudPassword").value, err=document.getElementById("cloudAuthError"); err.textContent="";
  if(!email||!password){err.textContent="Enter your email and password.";return;}
  try{ setCloudStatus("signing in…","warn"); const data=await supabaseAuth("/auth/v1/token?grant_type=password",{email,password}); saveCloudSession(data); closeModal("cloudAuthModal"); await startCloudForSignedInUser(); }catch(e){err.textContent=e.message;setCloudStatus("sign-in error","bad");}
}
function cloudSignOut(){ saveCloudSession(null); setCloudStatus("signed out","warn"); }
function collectCloudPayload(){ try{flushCurrentStateBeforeBackup();}catch(e){} const p=buildBackupPayload(); p.schemaVersion=2; p.savedAt=new Date().toISOString(); return p; }
async function cloudLoad(){
  if(!cloudReady) return false;
  try{ setCloudStatus("loading…","warn"); const q=`/rest/v1/meal_prep_state?user_id=eq.${encodeURIComponent(cloudUserId)}&select=payload&limit=1`; const r=await fetch(SUPABASE_URL+q,{headers:cloudHeaders()}); const data=await r.json().catch(()=>[]); if(r.status===401) throw new Error("Session expired"); if(!r.ok) throw new Error(data?.message||data?.hint||("HTTP "+r.status)); if(Array.isArray(data)&&data[0]?.payload){ cloudIsRestoring=true; try{restoreBackupPayload(data[0].payload);}finally{cloudIsRestoring=false;} setCloudStatus("synced","ok"); return true; } return false; }
  catch(e){ console.error("cloudLoad",e); setCloudStatus(e.message==="Session expired"?"sign in again":"setup needed","bad"); if(e.message==="Session expired") cloudSignOut(); return false; }
}
async function cloudSaveNow(){
  if(!cloudReady||cloudIsRestoring) return false;
  try{ setCloudStatus("saving…","warn"); const payload=collectCloudPayload(); const r=await fetch(SUPABASE_URL+"/rest/v1/meal_prep_state?on_conflict=user_id",{method:"POST",headers:cloudHeaders({"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify({user_id:cloudUserId,payload,updated_at:new Date().toISOString()})}); const data=await r.json().catch(()=>({})); if(r.status===401) throw new Error("Session expired"); if(!r.ok) throw new Error(data?.message||data?.hint||("HTTP "+r.status)); setCloudStatus("saved","ok"); return true; }
  catch(e){ console.error("cloudSaveNow",e); setCloudStatus(e.message==="Session expired"?"sign in again":"save error","bad"); if(e.message==="Session expired") cloudSignOut(); return false; }
}
function scheduleCloudSave(delay=600){ if(!cloudReady||cloudIsRestoring) return; clearTimeout(cloudSaveTimer); cloudSaveTimer=setTimeout(()=>cloudSaveNow(),delay); }
async function startCloudForSignedInUser(){ if(!cloudReady) return; const loaded=await cloudLoad(); if(!loaded) await cloudSaveNow(); }
function bindCloudAutosave(){
  document.addEventListener("input",e=>{if(e.target?.matches("input,select,textarea"))scheduleCloudSave(800);},true);
  document.addEventListener("change",e=>{if(e.target?.matches("input,select,textarea"))scheduleCloudSave(300);},true);
  document.addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; if(b.id!=="cloudAuthBtn"&&b.id!=="cloudSignInBtn"&&b.id!=="cloudSignUpBtn"&&b.id!=="cloudAuthClose") scheduleCloudSave(350); },true);
}
async function initCloud(){ bindCloudAutosave(); if(loadStoredCloudSession()){ setCloudStatus("connecting…","warn"); await startCloudForSignedInUser(); } else { setCloudStatus("signed out","warn"); setCloudAuthButton(); } }

function loadTargetsForProfile(){
  const defaults={kcal:2000,pPct:30,cPct:40,fPct:30,fi:35}; let t=null; try{ t=JSON.parse(localStorage.getItem(profileKey("macroTargets"))||"null"); }catch(e){} t=t||defaults;
  document.getElementById("tCal").value=t.kcal ?? defaults.kcal; document.getElementById("tPpct").value=t.pPct ?? defaults.pPct; document.getElementById("tCpct").value=t.cPct ?? defaults.cPct; document.getElementById("tFpct").value=t.fPct ?? defaults.fPct; document.getElementById("tFi").value=t.fi ?? defaults.fi;
}
function loadCustomFoods(){ try{ const saved=JSON.parse(localStorage.getItem("customFoods")||"{}"); Object.entries(saved).forEach(([name,data])=>{foods[name]=data;}); }catch(e){} }
function saveCustomFoods(){ const custom={}; Object.entries(foods).forEach(([name,data])=>{if(data&&data.note==="自定义")custom[name]=data;}); localStorage.setItem("customFoods",JSON.stringify(custom)); }
loadCustomFoods();
function foodOptions(selected){ return Object.keys(foods).map(n=>`<option value="${n}" ${n===selected?'selected':''}>${n}</option>`).join(""); }
function addRow(meal,foodName="0% Greek yogurt",amount=100){
  const rows=meal.querySelector(".rows"), row=document.createElement("div"); row.className="row foodrow";
  row.innerHTML=`<select class="food">${foodOptions(foodName)}</select><input class="amount" type="number" min="0" step="1" value="${amount}"><div class="num macrocell kcal">0</div><div class="num macrocell p">0</div><div class="num macrocell c">0</div><div class="num macrocell f">0</div><button class="delete" title="删除">×</button>`;
  rows.appendChild(row); row.querySelector(".food").addEventListener("change",()=>updateAll()); row.querySelector(".amount").addEventListener("input",()=>updateAll()); row.querySelector(".delete").addEventListener("click",()=>{row.remove();updateAll();}); updateAll();
}
document.querySelectorAll(".addFood").forEach(btn=>{btn.addEventListener("click",()=>addRow(btn.closest(".meal")));});
function calcRow(row){ const name=row.querySelector(".food").value, amt=+row.querySelector(".amount").value||0, x=foods[name], m=amt/x.base; return {kcal:x.kcal*m,p:x.p*m,c:x.c*m,f:x.f*m,fi:x.fi*m}; }
function polarToCartesian(cx,cy,r,angleDeg){ const angleRad=(angleDeg-90)*Math.PI/180.0; return {x:cx+r*Math.cos(angleRad),y:cy+r*Math.sin(angleRad)}; }
function describeArc(cx,cy,r,startAngle,endAngle){ const start=polarToCartesian(cx,cy,r,endAngle), end=polarToCartesian(cx,cy,r,startAngle), largeArcFlag=endAngle-startAngle<=180?"0":"1"; return ["M",start.x,start.y,"A",r,r,0,largeArcFlag,0,end.x,end.y].join(" "); }
function buildArcSvg(targetPercents,actualPercents,details){
  const cx=110,cy=110,targetR=89,actualR=75,gap=1.0; let svg=`<svg class="macro-svg" viewBox="0 0 220 220" aria-label="Macro target versus actual donut chart"><circle class="macro-ring-bg" cx="${cx}" cy="${cy}" r="${targetR}" stroke-width="8"></circle><circle class="macro-ring-bg" cx="${cx}" cy="${cy}" r="${actualR}" stroke-width="11"></circle>`;
  function tipText(d){ return `${d.name}||Actual ${d.actualG.toFixed(1)} g (${d.actualKcal.toFixed(0)} kcal)||Target ${d.targetG.toFixed(1)} g (${d.targetPct.toFixed(0)}%)||${d.actualG<=d.targetG?`Remaining ${(d.targetG-d.actualG).toFixed(1)} g`:`Over by ${(d.actualG-d.targetG).toFixed(1)} g`}`; }
  let targetStart=0; targetPercents.forEach((seg,i)=>{if(seg.pct<=0)return; const startAngle=targetStart*3.6+gap,endAngle=(targetStart+seg.pct)*3.6-gap; svg+=`<path class="macro-ring-target donut-segment" d="${describeArc(cx,cy,targetR,startAngle,endAngle)}" stroke="${seg.color}" data-tip="${tipText(details[i])}"></path>`; targetStart+=seg.pct;});
  let actualStart=0; const totalActualPct=actualPercents.reduce((sum,s)=>sum+s.pct,0),scale=totalActualPct>100?100/totalActualPct:1; actualPercents.forEach((seg,i)=>{const drawPct=seg.pct*scale;if(drawPct<=0)return;const startAngle=actualStart*3.6,endAngle=(actualStart+drawPct)*3.6;svg+=`<path class="macro-ring-actual donut-segment" d="${describeArc(cx,cy,actualR,startAngle,endAngle)}" stroke="${seg.color}" data-tip="${tipText(details[i])}"></path>`;actualStart+=drawPct;}); svg+=`</svg>`; return svg;
}
function macroDashboardHtml(total,t){
  const proteinCal=total.p*4,carbCal=total.c*4,fatCal=total.f*9; const targetPercents=[{name:"Protein",pct:t.pPct,color:"var(--protein)"},{name:"Carbs",pct:t.cPct,color:"var(--carb)"},{name:"Fat",pct:t.fPct,color:"var(--fat)"}]; const actualPercents=[{name:"Protein",pct:t.kcal>0?proteinCal/t.kcal*100:0,color:"var(--protein)"},{name:"Carbs",pct:t.kcal>0?carbCal/t.kcal*100:0,color:"var(--carb)"},{name:"Fat",pct:t.kcal>0?fatCal/t.kcal*100:0,color:"var(--fat)"}]; const details=[{name:"Protein",actualG:total.p,actualKcal:proteinCal,targetG:t.p,targetPct:t.pPct},{name:"Carbs",actualG:total.c,actualKcal:carbCal,targetG:t.c,targetPct:t.cPct},{name:"Fat",actualG:total.f,actualKcal:fatCal,targetG:t.f,targetPct:t.fPct}]; const donutSvg=buildArcSvg(targetPercents,actualPercents,details); return `<div class="macro-dashboard"><div class="macro-chart-wrap"><div class="macro-pie">${donutSvg}<div class="macro-center"><strong>${total.kcal.toFixed(0)} kcal</strong><span>${Math.max(t.kcal-total.kcal,0).toFixed(0)} kcal</span></div></div></div><div id="donutTooltip" class="donut-tooltip"></div></div>`;
}
function bindDonutTooltips(){ const tooltip=document.getElementById("donutTooltip"); if(!tooltip)return; document.querySelectorAll(".donut-segment").forEach(seg=>{seg.addEventListener("mouseenter",()=>{const parts=(seg.dataset.tip||"").split("||");tooltip.innerHTML=`<strong>${parts[0]||""}</strong><br>${parts.slice(1).join("<br>")}`;tooltip.classList.add("show");});seg.addEventListener("mousemove",e=>{tooltip.style.left=(e.clientX+14)+"px";tooltip.style.top=(e.clientY+14)+"px";});seg.addEventListener("mouseleave",()=>tooltip.classList.remove("show"));}); }
