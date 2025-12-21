/*****************************************************
 * DISPENSIA – FASE 2 Planner Semanal (HelloFresh-like)
 *****************************************************/

const SHEET_PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const SHEET_ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const SHEET_PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";

const feedEl = document.getElementById("feed");
const modalEl = document.getElementById("recipeModal");
const weekListEl = document.getElementById("weekList");

let platos = [];
let ingredientes = [];
let pasos = [];
let filtro = "all";

/* ================= STATE SEMANA ================= */
const days = ["L","M","X","J","V","S","D"];
let weekPlan = {
  L:null, M:null, X:null, J:null, V:null, S:null, D:null
};

/* ================= CSV LOAD ================= */
function loadCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: res => resolve(res.data),
      error: err => reject(err)
    });
  });
}

/* ================= DATA LOAD ================= */
async function loadData() {
  platos = await loadCSV(SHEET_PLATOS_URL);
  ingredientes = await loadCSV(SHEET_ING_URL);
  pasos = await loadCSV(SHEET_PASOS_URL);
  renderFeed();
  renderWeek();
}

/* ================= FILTERS ================= */
function isEtapa12(e){ return e==="1"||e==="2"; }
function isRapido(r){ return Number(r["tiempo_preparacion(min)"])<=25; }

function matchesFilter(r){
  if(!isEtapa12(r.etapa)) return false;
  if(filtro==="all") return true;
  if(filtro==="rapido") return isRapido(r);
  return r.tipo_plato?.toLowerCase().includes(filtro);
}

/* ================= FEED ================= */
function renderFeed(){
  feedEl.innerHTML="";
  platos.filter(matchesFilter).forEach(r=>{
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <img src="${IMG_BASE+r.imagen_archivo}">
      <div class="card-body">
        <h3>${r.nombre_plato}</h3>
        <p>⏱ ${r["tiempo_preparacion(min)"]} min · 🍽 ${r.porciones}</p>
        <div class="card-actions">
          <button class="primary" onclick="openRecipe('${r.codigo}')">Elegir plato</button>
        </div>
      </div>`;
    feedEl.appendChild(card);
  });
}

/* ================= MODAL ================= */
function openRecipe(codigo){
  const r=platos.find(p=>p.codigo===codigo);
  if(!r) return;

  document.getElementById("modalName").textContent=r.nombre_plato;
  document.getElementById("modalTime").textContent=`${r["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent=`${r.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent=r.dificultad;
  document.getElementById("videoFrame").src=`https://www.youtube.com/embed/${r.youtube_id}`;

  document.getElementById("modalIngredients").innerHTML =
    ingredientes.filter(i=>i.codigo_plato===codigo)
      .map(i=>`<li>${i.ingrediente} – ${i.cantidad||""}</li>`).join("");

  document.getElementById("modalSteps").innerHTML =
    pasos.filter(p=>p.codigo===codigo)
      .sort((a,b)=>a.orden-b.orden)
      .map(p=>`<li>${p.indicacion}</li>`).join("");

  // botones de días
  const assign=document.getElementById("assignBtns");
  assign.innerHTML="";
  days.forEach(d=>{
    const b=document.createElement("button");
    b.textContent=d;
    b.onclick=()=>{
      weekPlan[d]=r;
      closeRecipe();
      renderWeek();
    };
    assign.appendChild(b);
  });

  modalEl.style.display="flex";
}

function closeRecipe(){
  modalEl.style.display="none";
  document.getElementById("videoFrame").src="";
}

/* ================= WEEK VIEW ================= */
function renderWeek(){
  weekListEl.innerHTML="";
  days.forEach(d=>{
    const box=document.createElement("div");
    box.className="week-item";
    if(!weekPlan[d]){
      box.innerHTML=`<div class="week-day">${d}</div>
                     <div class="week-empty">Sin plato</div>`;
    } else {
      box.innerHTML=`
        <div class="week-day">${d}</div>
        <strong>${weekPlan[d].nombre_plato}</strong>
        <img src="${IMG_BASE+weekPlan[d].imagen_archivo}">
        <button class="week-remove" onclick="removeDay('${d}')">Quitar</button>`;
    }
    weekListEl.appendChild(box);
  });
}

function removeDay(d){
  weekPlan[d]=null;
  renderWeek();
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadData);
