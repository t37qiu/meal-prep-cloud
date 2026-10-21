const foods = {
  "0% Greek yogurt": {base:115, unit:"g", kcal:70, p:13, c:4, f:0, fi:0, note:"包装"},
  "Cottage cheese": {base:125, unit:"g", kcal:130, p:27, c:3, f:1, fi:0, note:"包装"},
  "Costco chipotle chicken": {base:60, unit:"g", kcal:80, p:13, c:2, f:2, fi:0, note:"包装"},
  "Chicken thigh": {base:100, unit:"g", kcal:221, p:16.5, c:0, f:16.6, fi:0, note:"USDA"},
  "Blade beef": {base:100, unit:"g", kcal:145, p:20, c:0, f:7, fi:0, note:"估算"},
  "Mixed nuts": {base:50, unit:"g", kcal:350, p:10, c:8, f:31, fi:4, note:"包装"},
  "Peanut butter": {base:15, unit:"g", kcal:90, p:4, c:4, f:7, fi:1, note:"包装"},
  "Pesto": {base:60, unit:"mL", kcal:330, p:6, c:9, f:30, fi:1, note:"包装"},
  "Light cream cheese": {base:30, unit:"g", kcal:60, p:3, c:2, f:4.5, fi:0, note:"包装"},
  "Blueberries": {base:100, unit:"g", kcal:57, p:0.7, c:14.5, f:0.3, fi:2.4, note:"通用估算"},
  "Apple": {base:100, unit:"g", kcal:52, p:0.3, c:13.8, f:0.2, fi:2.4, note:"通用估算"},
  "Gold kiwi": {base:100, unit:"g", kcal:63, p:1.0, c:15, f:0.5, fi:1.4, note:"通用估算"},
  "Orange / mandarin": {base:100, unit:"g", kcal:47, p:0.9, c:11.8, f:0.1, fi:2.4, note:"通用估算"},
  "Cherry tomatoes": {base:100, unit:"g", kcal:18, p:0.9, c:3.9, f:0.2, fi:1.2, note:"通用估算"},
  "Cooked mixed grains": {base:100, unit:"g", kcal:133, p:3.0, c:28, f:1.0, fi:2.0, note:"估算"},
  "Potato, raw": {base:100, unit:"g", kcal:77, p:2.0, c:17.5, f:0.1, fi:2.2, note:"通用估算"},
  "Sweet potato, raw": {base:100, unit:"g", kcal:86, p:1.6, c:20.1, f:0.1, fi:3.0, note:"通用估算"},
  "Oats, dry": {base:100, unit:"g", kcal:380, p:13, c:68, f:7, fi:10, note:"通用估算"},
  "Non-starchy vegetables": {base:100, unit:"g", kcal:30, p:2, c:5, f:0.3, fi:2.5, note:"估算"},
  "Grapeseed oil": {base:10, unit:"mL", kcal:80, p:0, c:0, f:9, fi:0, note:"包装"}
}
let activeProfile = localStorage.getItem("mealPrepActiveProfile") || "Ty";

function profileKey(base){
  return `${base}:${activeProfile}`;
}

function setActiveProfile(profile){
  if(profile===activeProfile) return;
  const wrap=document.getElementById("mealPlanWrap");
  wrap.classList.remove("open");
  wrap.setAttribute("aria-hidden","true");
  selectedDateKey=null;
  activeProfile=profile;
  localStorage.setItem("mealPrepActiveProfile",activeProfile);
  document.querySelectorAll(".profile-tab").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.profile===activeProfile);
  });
  loadTargetsForProfile();
  renderWeightCard();
  clearMealRows();
  updateAll();
  renderCalendar();
}

function flushCurrentStateBeforeBackup(){
  try{
    const kcalTarget=+document.getElementById("tCal").value||0;
    const pPct=+document.getElementById("tPpct").value||0;
    const cPct=+document.getElementById("tCpct").value||0;
    const fPct=+document.getElementById("tFpct").value||0;
    const fi=+document.getElementById("tFi").value||0;
    localStorage.setItem(profileKey("macroTargets"),JSON.stringify({kcal:kcalTarget,pPct,cPct,fPct,fi}));
  }catch(e){}
  try{
    if(weightTrackerMemory[activeProfile]) saveWeightTrackerData(weightTrackerMemory[activeProfile]);
  }catch(e){}
  try{
    if(selectedDateKey && document.getElementById("mealPlanWrap").classList.contains("open")) saveMealPlanForDate(selectedDateKey);
  }catch(e){}
}

function buildBackupPayload(){
  flushCurrentStateBeforeBackup();
  const storage={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key==="customFoods" || key==="mealPrepActiveProfile" || key.startsWith("macroTargets:") || key.startsWith("macroDay:") || key.startsWith("weightTracker:")) storage[key]=localStorage.getItem(key);
    }
  }catch(e){}
  const memoryTrackers={};
  ["Ty","Rl","Da"].forEach(profile=>{
    if(weightTrackerMemory[profile]) memoryTrackers[profile]=cloneWeightData(weightTrackerMemory[profile]);
  });
  return {app:"Meal Prep Macro Builder",version:1,exportedAt:new Date().toISOString(),activeProfile,storage,weightTrackerMemory:memoryTrackers};
}

function generateBackupText(){ return JSON.stringify(buildBackupPayload()); }

function openSaveBackup(){
  const box=document.getElementById("backupDataBox");
  box.value=generateBackupText();
  openModal("backupModal");
  setTimeout(()=>{ box.focus(); box.select(); },50);
}

function openLoadBackup(){
  const box=document.getElementById("backupDataBox");
  box.value="";
  openModal("backupModal");
  setTimeout(()=>box.focus(),50);
}

async function copyBackupText(){
  const box=document.getElementById("backupDataBox");
  const text=box.value || generateBackupText();
  box.value=text;
  try{ await navigator.clipboard.writeText(text); alert("Backup copied."); return; }catch(e){}
  box.focus(); box.select();
  try{ document.execCommand("copy"); alert("Backup copied."); }catch(e){ alert("Select the backup text and copy it manually."); }
}

function restoreBackupPayload(payload){
  if(!payload || payload.app!=="Meal Prep Macro Builder" || !payload.storage){ alert("This does not look like a valid Meal Prep backup."); return false; }
  Object.entries(payload.storage).forEach(([key,value])=>{
    try{ if(value===null || value===undefined) localStorage.removeItem(key); else localStorage.setItem(key,String(value)); }catch(e){}
  });
  Object.keys(weightTrackerMemory).forEach(k=>delete weightTrackerMemory[k]);
  if(payload.weightTrackerMemory){
    Object.entries(payload.weightTrackerMemory).forEach(([profile,data])=>{
      const clean=cloneWeightData(data);
      weightTrackerMemory[profile]=clean;
      try{ localStorage.setItem(`weightTracker:${profile}`,JSON.stringify(clean)); }catch(e){}
    });
  }
  try{
    const saved=JSON.parse(localStorage.getItem("customFoods")||"{}");
    Object.entries(saved).forEach(([name,data])=>{ foods[name]=data; });
  }catch(e){}
  activeProfile = payload.activeProfile || localStorage.getItem("mealPrepActiveProfile") || "Ty";
  localStorage.setItem("mealPrepActiveProfile",activeProfile);
  document.querySelectorAll(".profile-tab").forEach(btn=>{ btn.classList.toggle("active",btn.dataset.profile===activeProfile); });
  selectedDateKey=null;
  const wrap=document.getElementById("mealPlanWrap");
  if(wrap){ wrap.classList.remove("open"); wrap.setAttribute("aria-hidden","true"); }
  loadTargetsForProfile();
  renderWeightCard();
  clearMealRows();
  updateAll();
  renderCalendar();
  return true;
}

function restoreBackupFromText(){
  const box=document.getElementById("backupDataBox");
  const text=(box.value||"").trim();
  if(!text){ alert("Paste your backup code first."); return; }
  try{
    const payload=JSON.parse(text);
    const ok=restoreBackupPayload(payload);
    if(ok){ closeModal("backupModal"); alert("Backup restored."); }
  }catch(err){ console.error(err); alert("This backup code could not be read."); }
}
