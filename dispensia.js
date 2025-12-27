/*****************************************************
 * DISPENSIA – UX polish (feedback + estados)
 *****************************************************/

const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const STORAGE_KEY = "dispensia_week";

const feed = document.getElementById("feed");
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");
const weekCounter = document.getElementById("weekCounter");
const modal = document.getElementById("recipeModal");

let platos=[], ingredientes=[], pasos=[], filtro="all";
let week = loadWeek();
let currentPlate=null;

function fetchCSV(url){
  return new Promise((resolve,reject)=>{
    Papa.parse(url,{
      download:true, header:true, skipEmptyLines:true,
      complete:r=>resolve(r.data), error:reject
    });
  });
}

function loadWeek(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]; }
  catch{ return []; }
}
function saveWeek(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  bumpCounter();
  renderWeek(); renderShopping();
}
function bumpCounter(){
  weekCounter.textContent=`${week.length} platos en tu semana`;
  weekCounter.classList.add("bump");
  setTimeout(()=>weekCounter.classList.remove("bump"),200);
}

async function init(){
  platos=await fetchCSV(PLATOS_URL);
  ingredientes=await fetchCSV(ING_URL);
  pasos=await fetchCSV(PASOS_URL);
  render(); renderWeek(); renderShopping(); bumpCounter();
}
document.addEventListener("DOMContentLoaded",init);

/* Render feed */
function render(){
  feed.innerHTML="";
  platos.filter(p=>{
    if(!(p.etapa==="1"||p.etapa==="2")) return false;
    if(filtro==="all") return true;
    if(filtro==="rapido") return Number(p["tiempo_preparacion(min)"])<=25;
    return (p.tipo_plato||"").toLowerCase().includes(filtro);
  }).forEach(p=>{
    const c=document.createElement("div");
    c.className="card";
    c.innerHTML=`
      <img src="${IMG_BASE+p.imagen_archivo}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>${p["tiempo_preparacion(min)"]} min · ${p.porciones}</p>
        <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
      </div>`;
    feed.appendChild(c);
  });
}

/* Modal */
window.openRecipe=function(cod){
  const p=platos.find(x=>x.codigo===cod); if(!p) return;
  currentPlate=p;

  document.getElementById("modalName").textContent=p.nombre_plato;
  document.getElementById("modalTime").textContent=`${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent=`${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent=p.dificultad||"";
  document.getElementById("videoFrame").src=p.youtube_id?`https://www.youtube.com/embed/${p.youtube_id}`:"";

  document.getElementById("modalIngredients").innerHTML=
    ingredientes.filter(i=>i.codigo_plato===cod).map(i=>`<li>${i.ingrediente}</li>`).join("");
  document.getElementById("modalSteps").innerHTML=
    pasos.filter(s=>s.codigo===cod).sort((a,b)=>a.orden-b.orden).map(s=>`<li>${s.indicacion}</li>`).join("");

  modal.setAttribute("aria-hidden","false");
};

window.closeRecipe=function(){
  modal.setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
  currentPlate=null;
};

window.addCurrentPlate=function(){
  if(!currentPlate) return;
  if(!week.find(w=>w.codigo===currentPlate.codigo)){
    week.push(currentPlate);
    saveWeek();
  }
  closeRecipe();
};
window.removeCurrentPlate=function(){
  if(!currentPlate) return;
  week=week.filter(w=>w.codigo!==currentPlate.codigo);
  saveWeek(); closeRecipe();
};

/* Week */
function renderWeek(){
  weekList.innerHTML="";
  if(!week.length){
    weekList.innerHTML=`<li style="color:#6b7280">Aún no has agregado platos.</li>`; return;
  }
  week.forEach(p=>{
    const li=document.createElement("li");
    li.innerHTML=`${p.nombre_plato}<button onclick="removeFromWeek('${p.codigo}')">Quitar</button>`;
    weekList.appendChild(li);
  });
}
window.removeFromWeek=function(cod){
  week=week.filter(w=>w.codigo!==cod); saveWeek();
};

/* Shopping */
function renderShopping(){
  shoppingList.innerHTML="";
  const map={};
  week.forEach(p=>{
    ingredientes.filter(i=>i.codigo_plato===p.codigo)
      .forEach(i=>{ map[i.ingrediente]=(map[i.ingrediente]||0)+(Number(i.cantidad)||1); });
  });
  const entries=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  if(!entries.length){ shoppingList.innerHTML=`<li style="color:#6b7280">Agrega platos para ver tu lista.</li>`; return; }
  entries.forEach(([n,q])=>{
    const li=document.createElement("li"); li.textContent=`${n} — ${q}`; shoppingList.appendChild(li);
  });
}

/* Filters */
document.getElementById("chips").onclick=e=>{
  const f=e.target.dataset.filter; if(!f) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  e.target.classList.add("active"); filtro=f; render();
};
