/*****************************************************
/*****************************************************
 * DISPENSIA – versión estable
 * ✔ Receta: cantidad + unidad_medida (NO cambia)
 * ✔ Compras: cantidad_reg + unidad_reg (CAMBIO)
 *****************************************************/

/* ==== CONFIG ==== */
const PLATOS_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const PASOS_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";
const IMG_BASE="assets/img/";
const STORAGE="dispensia_week";

let platos=[],ingredientes=[],pasos=[];
let week=JSON.parse(localStorage.getItem(STORAGE))||[];
let currentPlate=null;
let filtro="all";

/* INIT */
document.addEventListener("DOMContentLoaded",async()=>{
  platos=await loadCSV(PLATOS_URL);
  ingredientes=await loadCSV(ING_URL);
  pasos=await loadCSV(PASOS_URL);
  buildFilters();
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();
});

/* CSV */
function loadCSV(url){
  return new Promise(res=>{
    Papa.parse(url,{download:true,header:true,complete:r=>res(r.data)});
  });
}

/* FILTERS */
function buildFilters(){
  const chips=document.getElementById("chips");
  const set=new Set();
  platos.forEach(p=>(p.tipo_plato||"").split(";").forEach(t=>set.add(t.trim())));
  chips.innerHTML=`<span class="chip active" onclick="setFilter('all',this)">Todas</span>`;
  [...set].forEach(t=>{
    const c=document.createElement("span");
    c.className="chip";
    c.textContent=t;
    c.onclick=()=>setFilter(t,c);
    chips.appendChild(c);
  });
}
function setFilter(f,c){
  filtro=f;
  document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
  c.classList.add("active");
  renderFeed();
}

/* FEED */
function renderFeed(){
  const feed=document.getElementById("feed");
  feed.innerHTML="";
  platos.filter(p=>p.etapa==="1"||p.etapa==="2")
    .filter(p=>filtro==="all"||p.tipo_plato.includes(filtro))
    .forEach(p=>{
      feed.innerHTML+=`
        <div class="card">
          <img src="${IMG_BASE+p.imagen_archivo}">
          <div class="card-body">
            <h3>${p.nombre_plato}</h3>
            <button onclick="openRecipe('${p.codigo}')">Ver plato</button>
          </div>
        </div>`;
    });
}

/* MODAL */
function openRecipe(c){
  currentPlate=platos.find(p=>p.codigo===c);
  document.getElementById("modalName").textContent=currentPlate.nombre_plato;
  document.getElementById("modalTime").textContent=`${currentPlate["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent=currentPlate.porciones;
  document.getElementById("modalDifficulty").textContent=currentPlate.dificultad;
  document.getElementById("videoFrame").src=`https://www.youtube.com/embed/${currentPlate.youtube_id}`;
  renderRecipeIngredients(c);
  renderSteps(c);
  document.getElementById("recipeModal").setAttribute("aria-hidden","false");
}
function closeRecipe(){
  document.getElementById("recipeModal").setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
}

/* INGREDIENTES */
function renderRecipeIngredients(c){
  const ul=document.getElementById("modalIngredients");
  ul.innerHTML="";
  ingredientes.filter(i=>i.codigo_plato===c).forEach(i=>{
    ul.innerHTML+=`<li>${i.ingrediente} (${i.cantidad} ${i.unidad_medida}) ${i.obs||""}</li>`;
  });
}

/* PASOS */
function renderSteps(c){
  const ol=document.getElementById("modalSteps");
  ol.innerHTML="";
  pasos.filter(p=>p.codigo===c).forEach(p=>ol.innerHTML+=`<li>${p.indicacion}</li>`);
}

/* WEEK */
function addCurrentPlate(){
  if(!week.find(w=>w.codigo===currentPlate.codigo)){
    week.push({codigo:currentPlate.codigo,nombre:currentPlate.nombre_plato});
    localStorage.setItem(STORAGE,JSON.stringify(week));
    renderWeek();renderShopping();updateCounter();
  }
  closeRecipe();
}
function renderWeek(){
  const el=document.getElementById("weekList");
  el.innerHTML="";
  week.forEach((p,i)=>{
    el.innerHTML+=`
      <div class="week-card">
        <span>${p.nombre}</span>
        <button onclick="removeWeek(${i})">Quitar</button>
      </div>`;
  });
}
function removeWeek(i){
  week.splice(i,1);
  localStorage.setItem(STORAGE,JSON.stringify(week));
  renderWeek();renderShopping();updateCounter();
}

/* SHOPPING */
function renderShopping(){
  const tb=document.getElementById("shoppingList");
  tb.innerHTML="";
  const map={};
  week.forEach(w=>{
    ingredientes.filter(i=>i.codigo_plato===w.codigo).forEach(i=>{
      const key=i.ingrediente+i.unidad_reg;
      if(!map[key]) map[key]={...i,qty:0};
      map[key].qty+=Number(i.cantidad_reg)||1;
    });
  });
  Object.values(map).forEach(i=>{
    tb.innerHTML+=`
      <tr>
        <td>${i.ingrediente}</td>
        <td>${i.qty}</td>
        <td>${i.unidad_reg}</td>
        <td>${i.tipo_ingrediente}</td>
      </tr>`;
  });
}

/* NAV */
function switchView(v,btn){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  document.getElementById("view-"+v).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
}
function updateCounter(){
  document.getElementById("weekCounter").textContent=`${week.length} platos en tu semana`;
}
