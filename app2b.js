function updateAll(){
  let total={kcal:0,p:0,c:0,f:0,fi:0};
  document.querySelectorAll(".meal").forEach(meal=>{
    let mt={kcal:0,p:0,c:0,f:0,fi:0};
    meal.querySelectorAll(".foodrow").forEach(row=>{
      const v=calcRow(row);
      ["kcal","p","c","f","fi"].forEach(k=>{mt[k]+=v[k]; total[k]+=v[k];});
      row.querySelector(".kcal").textContent=v.kcal.toFixed(0);
      row.querySelector(".p").textContent=v.p.toFixed(1);
      row.querySelector(".c").textContent=v.c.toFixed(1);
      row.querySelector(".f").textContent=v.f.toFixed(1);
    });
    meal.querySelector(".meal-total").textContent=`${mt.kcal.toFixed(0)} kcal · P ${mt.p.toFixed(0)} · C ${mt.c.toFixed(0)} · F ${mt.f.toFixed(0)}`;
  });
  const kcalTarget=+document.getElementById("tCal").value||0;
  const pPct=+document.getElementById("tPpct").value||0;
  const cPct=+document.getElementById("tCpct").value||0;
  const fPct=+document.getElementById("tFpct").value||0;
  const t={kcal:kcalTarget,p:kcalTarget*pPct/100/4,c:kcalTarget*cPct/100/4,f:kcalTarget*fPct/100/9,fi:+document.getElementById("tFi").value||0,pPct,cPct,fPct};
  document.getElementById("metrics").innerHTML = macroDashboardHtml(total,t);
  bindDonutTooltips();
  localStorage.setItem(profileKey("macroTargets"),JSON.stringify(t));
}
["tCal","tPpct","tCpct","tFpct","tFi"].forEach(id=>document.getElementById(id).addEventListener("input",updateAll));
function openModal(id){ const el=document.getElementById(id); if(!el)return; el.classList.add("open"); el.setAttribute("aria-hidden","false"); }
function closeModal(id){ const el=document.getElementById(id); if(!el)return; el.classList.remove("open"); el.setAttribute("aria-hidden","true"); }
function openNutritionEditor(){ openModal("targetModal"); }
document.getElementById("nutritionTargetCard").addEventListener("click", openNutritionEditor);
document.getElementById("targetModalClose").addEventListener("click", ()=>closeModal("targetModal"));
document.getElementById("targetModalCancel").addEventListener("click", ()=>closeModal("targetModal"));
document.getElementById("targetModalDone").addEventListener("click", ()=>{ updateAll(); closeModal("targetModal"); });
document.getElementById("targetModal").addEventListener("click", e=>{ if(e.target===document.getElementById("targetModal")) closeModal("targetModal"); });

const weightTrackerMemory = {};
const builtInWeightSeed = {
  Ty: {goal: 85,entries: [{"date":"2026-07-27","weight":132.0},{"date":"2026-08-01","weight":131.8},{"date":"2026-08-04","weight":130.6},{"date":"2026-08-08","weight":130.2},{"date":"2026-08-18","weight":130.1},{"date":"2026-08-22","weight":127.3},{"date":"2026-09-01","weight":126.5},{"date":"2026-09-04","weight":123.7},{"date":"2026-09-07","weight":122.5},{"date":"2026-09-23","weight":122.3},{"date":"2026-09-28","weight":121.7},{"date":"2026-10-06","weight":120.6},{"date":"2026-10-11","weight":118.5},{"date":"2026-10-12","weight":118.0},{"date":"2026-10-21","weight":116.6}]},
  Rl:{goal:null,entries:[]}, Da:{goal:null,entries:[]}
};
function cloneWeightData(data){ return {goal:data&&data.goal!=null?+data.goal:null,entries:Array.isArray(data&&data.entries)?data.entries.map(x=>({date:x.date,weight:+x.weight})):[]}; }
function weightStorageKey(){ return profileKey("weightTracker"); }
function readWindowState(){ try{ if(!window.name||!window.name.startsWith("MEAL_PREP_STATE:")) return {}; return JSON.parse(window.name.slice("MEAL_PREP_STATE:".length))||{}; }catch(e){return {};} }
function writeWindowState(update){ try{ const state=readWindowState(); window.name="MEAL_PREP_STATE:"+JSON.stringify({...state,...update}); }catch(e){} }
function readWeightBackup(){ const state=readWindowState(); return state.weightTrackers&&state.weightTrackers[activeProfile]?cloneWeightData(state.weightTrackers[activeProfile]):null; }
function writeWeightBackup(data){ const state=readWindowState(),trackers={...(state.weightTrackers||{})}; trackers[activeProfile]=cloneWeightData(data); writeWindowState({weightTrackers:trackers}); }
function getWeightTrackerData(){
  if(weightTrackerMemory[activeProfile]) return cloneWeightData(weightTrackerMemory[activeProfile]);
  let data=null;
  try{ const raw=JSON.parse(localStorage.getItem(weightStorageKey())||"null"); if(raw)data=cloneWeightData(raw); }catch(e){}
  if(!data) data=readWeightBackup();
  if(!data){
    try{ const old=JSON.parse(localStorage.getItem(profileKey("weightTarget"))||"null"); if(old){ data={goal:old.goal??null,entries:[]}; if(old.current!=null){ const now=new Date(); const localToday=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-"); data.entries=[{date:localToday,weight:+old.current}]; } } }catch(e){}
  }
  if(!data) data=cloneWeightData(builtInWeightSeed[activeProfile]||{goal:null,entries:[]});
  else if(activeProfile==="Ty"){
    const byDate=new Map((builtInWeightSeed.Ty.entries||[]).map(x=>[x.date,{date:x.date,weight:+x.weight}]));
    (data.entries||[]).forEach(x=>byDate.set(x.date,{date:x.date,weight:+x.weight}));
    data.entries=[...byDate.values()];
  }
  data.entries=(data.entries||[]).filter(x=>x&&x.date&&Number.isFinite(+x.weight)).map(x=>({date:x.date,weight:+x.weight})).sort((a,b)=>a.date.localeCompare(b.date));
  weightTrackerMemory[activeProfile]=cloneWeightData(data);
  try{ localStorage.setItem(weightStorageKey(),JSON.stringify(data)); }catch(e){}
  writeWeightBackup(data);
  return cloneWeightData(data);
}
function saveWeightTrackerData(data){
  const clean=cloneWeightData(data); clean.entries=clean.entries.filter(x=>x&&x.date&&Number.isFinite(+x.weight)).sort((a,b)=>a.date.localeCompare(b.date));
  weightTrackerMemory[activeProfile]=cloneWeightData(clean);
  try{ localStorage.setItem(weightStorageKey(),JSON.stringify(clean)); }catch(e){}
  writeWeightBackup(clean);
}
function saveGoalWeightFromInput(){
  const input=document.getElementById("wGoal"),raw=input.value,data=getWeightTrackerData(); data.goal=raw===""?null:+raw; saveWeightTrackerData(data); renderWeightCard();
  const goalEl=document.getElementById("trackerGoal");
  if(goalEl){ const latest=data.entries&&data.entries.length?data.entries[data.entries.length-1]:null; goalEl.textContent=latest&&data.goal!=null&&Number.isFinite(+data.goal)?`${Math.max(0,latest.weight-(+data.goal)).toFixed(1)} kg`:"—"; }
}
