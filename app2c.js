function renderWeightCard(){
  const data=getWeightTrackerData();
  document.getElementById("weightGoal").textContent =
    data.goal!=null && Number.isFinite(+data.goal) ? `${(+data.goal).toFixed(1)} kg` : "Set goal";
}

function drawWeightChart(entries){
  const svg=document.getElementById("weightChart");
  svg.innerHTML="";
  const W=520,H=170,padX=28,padTop=16,padBottom=34;
  const plotH=H-padTop-padBottom;

  if(!entries.length){
    svg.innerHTML=`<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#9ca3af" font-size="13">No entries yet</text>`;
    const dateRow=document.getElementById("weightChartDates");
    if(dateRow) dateRow.innerHTML="";
    return;
  }

  const values=entries.map(e=>e.weight);
  let min=Math.min(...values), max=Math.max(...values);
  if(min===max){ min-=1; max+=1; }
  const extra=(max-min)*0.12 || 1;
  min-=extra; max+=extra;

  const x=i=> entries.length===1 ? W/2 : padX + i*(W-2*padX)/(entries.length-1);
  const y=v=> padTop + (max-v)*plotH/(max-min);

  for(let i=0;i<4;i++){
    const yy=padTop+i*plotH/3;
    svg.insertAdjacentHTML("beforeend",`<line x1="${padX}" y1="${yy}" x2="${W-padX}" y2="${yy}" stroke="#eef1f5" stroke-width="1"/>`);
  }

  const points=entries.map((e,i)=>`${x(i)},${y(e.weight)}`).join(" ");
  if(entries.length>1){
    svg.insertAdjacentHTML("beforeend",`<polyline points="${points}" fill="none" stroke="#5b7cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  const pointLabelIndexes = new Set();
  if(entries.length <= 10){
    entries.forEach((_,i)=>pointLabelIndexes.add(i));
  }else if(entries.length <= 20){
    entries.forEach((_,i)=>{ if(i%2===0) pointLabelIndexes.add(i); });
    pointLabelIndexes.add(entries.length-1);
  }else{
    const targetLabels = 8;
    for(let j=0;j<targetLabels;j++){
      const i=Math.round(j*(entries.length-1)/(targetLabels-1));
      pointLabelIndexes.add(i);
    }
  }

  entries.forEach((e,i)=>{
    const cx=x(i);
    const cy=y(e.weight);
    const labelY=Math.max(cy-10,12);
    const label = pointLabelIndexes.has(i)
      ? `<text class="weight-point-label" x="${cx}" y="${labelY}" text-anchor="middle">${e.weight.toFixed(1)}</text>`
      : "";
    svg.insertAdjacentHTML("beforeend",`${label}<circle cx="${cx}" cy="${cy}" r="4.5" fill="#5b7cff"><title>${e.date}: ${e.weight.toFixed(1)} kg</title></circle>`);
  });

  const dateRow=document.getElementById("weightChartDates");
  if(!dateRow) return;
  dateRow.innerHTML="";

  const labels=[];
  if(entries.length<=5){
    entries.forEach((e)=>labels.push(e.date));
  }else{
    labels.push(entries[0].date);
    labels.push(entries[Math.round((entries.length-1)/2)].date);
    labels.push(entries[entries.length-1].date);
  }

  labels.forEach(d=>{
    const parts=d.split("-");
    const span=document.createElement("span");
    span.textContent=`${parts[1]}/${parts[2]}`;
    dateRow.appendChild(span);
  });
}

function renderWeightTracker(){
  const data=getWeightTrackerData();
  document.getElementById("wGoal").value=data.goal ?? "";
  const now=new Date();
  const localToday=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
  document.getElementById("wLogDate").value=localToday;

  const entries=data.entries;
  const latest=entries.length ? entries[entries.length-1] : null;
  const first=entries.length ? entries[0] : null;

  document.getElementById("trackerLatest").textContent=latest ? `${latest.weight.toFixed(1)} kg` : "—";
  document.getElementById("trackerChange").textContent=
    latest && first ? `${(latest.weight-first.weight)>=0?"+":""}${(latest.weight-first.weight).toFixed(1)} kg` : "—";
  document.getElementById("trackerGoal").textContent=
    latest && data.goal!=null && Number.isFinite(+data.goal)
      ? `${Math.max(0, latest.weight-(+data.goal)).toFixed(1)} kg`
      : "—";

  drawWeightChart(entries);
}

function openWeightEditor(){
  renderWeightTracker();
  openModal("weightModal");
}

document.getElementById("weightTargetCard").addEventListener("click", openWeightEditor);

function addWeightEntryFromInputs(){
  const date=document.getElementById("wLogDate").value;
  const weight=+document.getElementById("wLogWeight").value;
  if(!date || !Number.isFinite(weight) || weight<=0) return;

  const data=getWeightTrackerData();
  data.entries=data.entries.filter(x=>x.date!==date);
  data.entries.push({date,weight});
  data.entries.sort((a,b)=>a.date.localeCompare(b.date));
  saveWeightTrackerData(data);

  document.getElementById("wLogWeight").value="";
  renderWeightTracker();
  renderWeightCard();
}

document.getElementById("wGoal").addEventListener("input", saveGoalWeightFromInput);
document.getElementById("wGoal").addEventListener("change", saveGoalWeightFromInput);
document.getElementById("wGoal").addEventListener("keydown", e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    saveGoalWeightFromInput();
  }
});

document.getElementById("wLogWeight").addEventListener("keydown", e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    addWeightEntryFromInputs();
  }
});

document.getElementById("weightModalClose").addEventListener("click", ()=>closeModal("weightModal"));
document.getElementById("weightModalDone").addEventListener("click", ()=>{
  saveGoalWeightFromInput();
  closeModal("weightModal");
});
document.getElementById("weightModal").addEventListener("click", e=>{
  if(e.target===document.getElementById("weightModal")) closeModal("weightModal");
});
