let customFoodTargetMeal = null;

function openCustomFoodModal(targetMeal){
  customFoodTargetMeal = targetMeal;
  document.getElementById("cfName").value="";
  document.getElementById("cfBase").value="100";
  document.getElementById("cfUnit").value="g";
  document.getElementById("cfKcal").value="0";
  document.getElementById("cfP").value="0";
  document.getElementById("cfC").value="0";
  document.getElementById("cfF").value="0";
  document.getElementById("cfFi").value="0";
  document.getElementById("customFoodModal").classList.add("open");
  document.getElementById("customFoodModal").setAttribute("aria-hidden","false");
  setTimeout(()=>document.getElementById("cfName").focus(),0);
}

function closeCustomFoodModal(){
  document.getElementById("customFoodModal").classList.remove("open");
  document.getElementById("customFoodModal").setAttribute("aria-hidden","true");
  customFoodTargetMeal=null;
}

document.querySelectorAll(".customFoodInline").forEach(btn=>{
  btn.addEventListener("click", ()=>openCustomFoodModal(btn.closest(".meal")));
});

document.getElementById("customFoodClose").addEventListener("click", closeCustomFoodModal);
document.getElementById("customFoodCancel").addEventListener("click", closeCustomFoodModal);
document.getElementById("customFoodModal").addEventListener("click", e=>{
  if(e.target===document.getElementById("customFoodModal")) closeCustomFoodModal();
});

document.getElementById("customFoodSave").addEventListener("click", ()=>{
  const name=document.getElementById("cfName").value.trim();
  if(!name){ document.getElementById("cfName").focus(); return; }

  const base=Math.max(+document.getElementById("cfBase").value||0,0.1);
  const unit=document.getElementById("cfUnit").value;
  const kcal=Math.max(+document.getElementById("cfKcal").value||0,0);
  const p=Math.max(+document.getElementById("cfP").value||0,0);
  const c=Math.max(+document.getElementById("cfC").value||0,0);
  const f=Math.max(+document.getElementById("cfF").value||0,0);
  const fi=Math.max(+document.getElementById("cfFi").value||0,0);

  foods[name]={base,unit,kcal,p,c,f,fi,note:"自定义"};
  saveCustomFoods();
  document.querySelectorAll(".food").forEach(sel=>{
    const current=sel.value;
    sel.innerHTML=foodOptions(current);
  });

  const meal=customFoodTargetMeal;
  closeCustomFoodModal();
  if(meal) addRow(meal,name,base);
});

document.getElementById("manageCustomFoods").addEventListener("click", ()=>{
  const savedNames = Object.entries(foods)
    .filter(([_,data])=>data && data.note==="自定义")
    .map(([name])=>name);

  if(savedNames.length===0){
    alert("还没有保存的自定义食物。");
    return;
  }

  const choice = prompt("输入要删除的自定义食物名称：\n\n" + savedNames.join("\n"));
  if(!choice) return;
  if(!foods[choice] || foods[choice].note!=="自定义"){
    alert("没有找到这个自定义食物。");
    return;
  }

  delete foods[choice];
  saveCustomFoods();

  document.querySelectorAll(".food").forEach(sel=>{
    const current=sel.value;
    sel.innerHTML=foodOptions(current);
    if(!foods[current]) sel.value=Object.keys(foods)[0];
  });

  updateAll();
  alert(`已删除 ${choice}`);
});

document.getElementById("saveBtn").addEventListener("click", ()=>{
  if(!selectedDateKey) return;
  saveMealPlanForDate(selectedDateKey);
  alert("已保存这一天的 meal plan。");
});

document.getElementById("resetBtn").addEventListener("click", ()=>{
  if(confirm("清空这一天所有食物？")){
    document.querySelectorAll(".foodrow").forEach(r=>r.remove());
    if(selectedDateKey){
      localStorage.removeItem(profileKey(`macroDay:${selectedDateKey}`));
    }
    updateAll();
  }
});

function currentMealState(){
  const state=[];
  document.querySelectorAll(".meal").forEach(meal=>{
    state.push({
      meal:meal.dataset.meal,
      items:[...meal.querySelectorAll(".foodrow")].map(r=>({
        food:r.querySelector(".food").value,
        amount:+r.querySelector(".amount").value||0
      }))
    });
  });
  return state;
}

function saveMealPlanForDate(key){
  localStorage.setItem(profileKey(`macroDay:${key}`), JSON.stringify(currentMealState()));
  renderCalendar();
}

function clearMealRows(){
  document.querySelectorAll(".foodrow").forEach(r=>r.remove());
}

function loadDefaultMealPlan(){
  const meals=document.querySelectorAll(".meal");
  if(meals.length<3) return;
  addRow(meals[0],"0% Greek yogurt",230);
  addRow(meals[0],"Blueberries",150);

  addRow(meals[1],"Chicken thigh",200);
  addRow(meals[1],"Cooked mixed grains",180);
  addRow(meals[1],"Non-starchy vegetables",300);

  addRow(meals[2],"Blade beef",200);
  addRow(meals[2],"Potato, raw",300);
  addRow(meals[2],"Non-starchy vegetables",300);
  addRow(meals[2],"Pesto",15);
}

function loadMealPlanForDate(key){
  clearMealRows();
  const raw=localStorage.getItem(profileKey(`macroDay:${key}`));
  if(raw){
    try{
      const state=JSON.parse(raw);
      state.forEach(s=>{
        const meal=[...document.querySelectorAll(".meal")].find(m=>m.dataset.meal===s.meal);
        if(meal) s.items.forEach(i=>addRow(meal,i.food,i.amount));
      });
    }catch(e){
      loadDefaultMealPlan();
    }
  }else{
    loadDefaultMealPlan();
  }
  updateAll();
}

let calendarCursor = new Date();
calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
let selectedDateKey = null;

function dateKey(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function formatSelectedDate(d){
  return d.toLocaleDateString(undefined,{weekday:"long", year:"numeric", month:"long", day:"numeric"});
}

function getCalendarDayCalories(key){
  let state;
  try{state=JSON.parse(localStorage.getItem(profileKey(`macroDay:${key}`))||"null");}catch(e){return null;}
  if(!Array.isArray(state))return null;
  let calories=0;
  for(const meal of state){
    for(const item of (Array.isArray(meal.items)?meal.items:[])){
      const food=foods[item.food],amount=Number(item.amount);
      if(food&&Number(food.base)>0&&Number.isFinite(amount)&&amount>0)calories+=Number(food.kcal||0)*amount/Number(food.base);
    }
  }
  return Math.max(0,calories);
}
function makeCalendarRing(calories,target){
  const ratio=target>0?calories/target:0;
  const percent=Math.round(ratio*100);
  const color=ratio>1?"#ed9a43":ratio>=0.9?"#25af88":"#668dff";
  const ring=document.createElement("span");
  ring.className="calendar-ring";
  ring.style.setProperty("--ring-progress",String(Math.max(0,Math.min(100,ratio*100)))+"%");
  ring.style.setProperty("--ring-color",color);
  const center=document.createElement("span");
  center.className="calendar-ring-center";
  center.textContent=percent+"%";
  ring.appendChild(center);
  return ring;
}
function renderCalendar(){
  const title=document.getElementById("calendarTitle");
  const grid=document.getElementById("calendarGrid");
  const year=calendarCursor.getFullYear();
  const month=calendarCursor.getMonth();

  title.textContent=new Date(year,month,1).toLocaleDateString(undefined,{month:"long", year:"numeric"});

  grid.innerHTML="";
  const firstDay=new Date(year,month,1);
  const startOffset=firstDay.getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const prevDays=new Date(year,month,0).getDate();
  const todayKey=dateKey(new Date());

  for(let i=0;i<42;i++){
    let d, muted=false;
    if(i < startOffset){
      d=new Date(year,month-1,prevDays-startOffset+i+1);
      muted=true;
    }else if(i >= startOffset+daysInMonth){
      d=new Date(year,month+1,i-(startOffset+daysInMonth)+1);
      muted=true;
    }else{
      d=new Date(year,month,i-startOffset+1);
    }

    const key=dateKey(d);
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="calendar-day";
    if(muted) btn.classList.add("muted");
    if(key===todayKey) btn.classList.add("today");
    if(key===selectedDateKey) btn.classList.add("selected");
    const dayNumber=document.createElement("span");
    dayNumber.className="calendar-day-number";
    dayNumber.textContent=d.getDate();
    btn.appendChild(dayNumber);
    const calories=getCalendarDayCalories(key);
    let targets=null;
    try{targets=JSON.parse(localStorage.getItem(profileKey("macroTargets"))||"null");}catch(e){}
    const target=Number(targets?.kcal||document.getElementById("tCal").value||2000);
    if(calories!==null && target>0){
      btn.appendChild(makeCalendarRing(calories,target));
      btn.title=`${key}: ${Math.round(calories)} / ${Math.round(target)} kcal`;
    }else{
      const empty=document.createElement("span");
      empty.className="calendar-ring calendar-ring-empty";
      empty.textContent="–";
      btn.appendChild(empty);
      btn.title=`${key}: No logged meals`;
    }

    btn.addEventListener("click",()=>{
      selectedDateKey=key;
      if(d.getMonth()!==calendarCursor.getMonth() || d.getFullYear()!==calendarCursor.getFullYear()){
        calendarCursor=new Date(d.getFullYear(),d.getMonth(),1);
      }
      document.getElementById("selectedDateLabel").textContent=`${activeProfile} · ${formatSelectedDate(d)}`;
      loadMealPlanForDate(selectedDateKey);
      const wrap=document.getElementById("mealPlanWrap");
      wrap.classList.add("open");
      wrap.setAttribute("aria-hidden","false");
      renderCalendar();
    });

    grid.appendChild(btn);
  }
}

document.getElementById("prevMonthBtn").addEventListener("click",()=>{
  calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);
  renderCalendar();
});
document.getElementById("nextMonthBtn").addEventListener("click",()=>{
  calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);
  renderCalendar();
});
document.getElementById("todayBtn").addEventListener("click",()=>{
  const t=new Date();
  calendarCursor=new Date(t.getFullYear(),t.getMonth(),1);
  renderCalendar();
});

document.getElementById("mealPlanClose").addEventListener("click", ()=>{
  const wrap=document.getElementById("mealPlanWrap");
  wrap.classList.remove("open");
  wrap.setAttribute("aria-hidden","true");
});

document.getElementById("mealPlanWrap").addEventListener("click", e=>{
  if(e.target===document.getElementById("mealPlanWrap")){
    const wrap=document.getElementById("mealPlanWrap");
    wrap.classList.remove("open");
    wrap.setAttribute("aria-hidden","true");
  }
});

document.querySelectorAll(".profile-tab").forEach(btn=>{
  btn.addEventListener("click",()=>setActiveProfile(btn.dataset.profile));
});

function load(){
  document.querySelectorAll(".profile-tab").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.profile===activeProfile);
  });
  loadTargetsForProfile();
  renderWeightCard();
  updateAll();
}
load();
renderCalendar();

document.getElementById("cloudAuthBtn").addEventListener("click",()=>{
  if(cloudReady){ cloudSignOut(); return; }
  document.getElementById("cloudAuthError").textContent="";
  openModal("cloudAuthModal");
});
document.getElementById("cloudAuthClose").addEventListener("click",()=>closeModal("cloudAuthModal"));
document.getElementById("cloudAuthModal").addEventListener("click",e=>{if(e.target===document.getElementById("cloudAuthModal"))closeModal("cloudAuthModal");});
document.getElementById("cloudSignInBtn").addEventListener("click",cloudSignIn);
document.getElementById("cloudSignUpBtn").addEventListener("click",cloudSignUp);
document.getElementById("cloudPassword").addEventListener("keydown",e=>{if(e.key==="Enter")cloudSignIn();});

initCloud();

document.getElementById("exportBackupBtn").addEventListener("click",downloadMealPrepBackup);
document.getElementById("importBackupBtn").addEventListener("click",()=>document.getElementById("importBackupFile").click());
document.getElementById("importBackupFile").addEventListener("change",e=>{
  const f=e.target.files?.[0];
  if(f)importMealPrepBackup(f);
  e.target.value="";
});
