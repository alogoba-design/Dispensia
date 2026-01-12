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
const STORAGE_KEY="dispensia_week";

/* ==== STATE ==== */
let platos=[],ingredientes=[],pasos=[];
let week=JSON.parse(localStorage.getItem(STORAGE_KEY))||[];
let currentPlate=null;
let filtro="all";

/* ==== DOM ==== */
const feed=document.getElementById("feed");
const chips=document.getElementById("chips");
const modal=document.getElementById("recipeModal");
const weekCounter=document.getElementById("weekCounter");
const weekList=document.getElementById("weekList");
const shoppingList=document.getElementById("shoppingList");

/* ==== CSV ==== */
function fetchCSV(url){
  return new Promise((res,rej)=>{
    Papa.parse(url,{download:true,header:true,skipEmptyLines:true,complete:r=>res(r.data),error:e=>rej(e)});
  });
}

/* ==== INIT ==== */
document.addEventListener("DOMContentLoaded",async()=>{
  try{
    platos=await fetchCSV(PLATOS_URL);
    ingredientes=await fetchCSV(ING_URL);
    pasos=await fetchCSV(PASOS_URL);
  }catch(e){
    console.error("Error cargando CSV:",e);
  }
  buildFilters();
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();
});

/* ==== FILTERS ==== */
function buildFilters(){
  const set=new Set();
  platos.forEach(p=>(p.tipo_plato||"").toLowerCase().split(";").map(t=>t.trim()).filter(Boolean).forEach(t=>set.add(t)));

  chips.innerHTML=`<span class="chip active" data-filter="all">Todas</span>
                   <span class="chip" data-filter="rapido">Rápidas</span>`;

  [...set].sort().forEach(t=>{
    const c=document.createElement("span");
    c.className="chip";
    c.dataset.filter=t;
    c.textContent=t;
    chips.appendChild(c);
  });

  chips.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{
    chips.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
    c.classList.add("active");
    filtro=c.dataset.filter;
    renderFeed();
  });
}

/* ==== FEED ==== */
function renderFeed(){
  feed.innerHTML="";
  platos
    .filter(p=>p.etapa==="1"||p.etapa==="2")
    .filter(p=>{
      if(filtro==="all") return true;
      if(filtro==="rapido") return Number(p["tiempo_preparacion(min)"])<=25;
      return (p.tipo_plato||"").toLowerCase().split(";").includes(filtro);
    })
    .forEach(p=>{
      const card=document.createElement("div");
      card.className="card";
      card.innerHTML=`
        <img src="${IMG_BASE+p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <button onclick="openRecipe('${p.codigo}')">Ver plato</button>
        </div>`;
      feed.appendChild(card);
    });
}

/* ==== MODAL ==== */
window.openRecipe=function(codigo){
  currentPlate=platos.find(p=>p.codigo===codigo);
  if(!currentPlate) return;

  document.getElementById("modalName").textContent=currentPlate.nombre_plato;
  document.getElementById("modalTime").textContent=`${currentPlate["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent=`${currentPlate.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent=currentPlate.dificultad||"";
  document.getElementById("videoFrame").src=currentPlate.youtube_id?`https://www.youtube.com/embed/${currentPlate.youtube_id}`:"";

  renderRecipeIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden","false");
};

window.closeRecipe=function(){
  modal.setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
};

modal.onclick=e=>{ if(e.target===modal) closeRecipe(); };

/* ==== RECETA: INGREDIENTES por parte_del_plato, con obs ==== */
function renderRecipeIngredients(codigo){
  const ul=document.getElementById("modalIngredients");
  ul.innerHTML="";
  const grouped={};

  ingredientes.filter(i=>i.codigo_plato===codigo).forEach(i=>{
    const part=(i.parte_del_plato||"Otros").trim();
    if(!grouped[part]) grouped[part]=[];
    grouped[part].push(i);
  });

  Object.entries(grouped).forEach(([part,items])=>{
    ul.innerHTML+=`<li><strong>${part}</strong></li>`;
    items.forEach(i=>{
      const q=i.cantidad||1;
      const u=i.unidad_medida?` ${i.unidad_medida}`:"";
      const o=i.obs?` ${i.obs}`:"";
      ul.innerHTML+=`<li>– ${i.ingrediente} (${q}${u})${o}</li>`;
    });
  });
}

/* ==== PASOS ==== */
function renderSteps(codigo){
  const ol=document.getElementById("modalSteps");
  ol.innerHTML="";
  pasos
    .filter(p=>p.codigo===codigo)
    .sort((a,b)=>Number(a.orden)-Number(b.orden))
    .forEach(p=>ol.innerHTML+=`<li>${p.indicacion}</li>`);
}

/* ==== SEMANA ==== */
window.addCurrentPlate=function(){
  if(!currentPlate) return;

  if(!week.some(w=>w.codigo === currentPlate.codigo)){
    week.push({codigo:currentPlate.codigo,nombre_plato:currentPlate.nombre_plato});
    saveWeek();
  }
  closeRecipe();
};

function renderWeek(){
  if(!weekList) return;
  weekList.innerHTML = week.map(p=>`<li>${p.nombre_plato}</li>`).join("") || `<li style="opacity:.6">Aún no has agregado platos</li>`;
}

/* ==== COMPRAS (cantidad_reg / unidad_reg) ==== */
function renderShopping(){
  if(!shoppingList) return;
  shoppingList.innerHTML="";
  if(!week.length){ shoppingList.innerHTML="<div style='opacity:.6'>Agrega platos para ver tu lista.</div>"; return; }

  const grouped={};

  week.forEach(w=>{
    ingredientes.filter(i=>i.codigo_plato===w.codigo).forEach(i=>{
      const cat=(i.tipo_ingrediente||"Otros").trim();
      const name=(i.ingrediente||"").trim();
      const unit=(i.unidad_reg||"").trim();
      const key=unit?`${name}__${unit}`:name;
      const qty=Number(i.cantidad_reg)||1;

      if(!grouped[cat]) grouped[cat]={};
      if(!grouped[cat][key]) grouped[cat][key]={name,unit,qty:0};
      grouped[cat][key].qty += qty;
    });
  });

  Object.entries(grouped).forEach(([c,it])=>{
    shoppingList.innerHTML += `<div class="shopping-category-title">${c}</div>`;
    Object.values(it).forEach(i=>{
      const unitTxt=i.unit?` ${i.unit}`:"";
      shoppingList.innerHTML += `<div class="shopping-item"><span>${i.name}</span><span>${i.qty}${unitTxt}</span></div>`;
    });
  });
}

/* ==== STORAGE ==== */
function saveWeek(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(week));
  renderWeek();
  renderShopping();
  updateCounter();
}

function updateCounter(){
  if(weekCounter) weekCounter.textContent=`${week.length} platos en tu semana`;
}

/* ==== EXPORT (PDF simple + WhatsApp) ==== */
window.exportShoppingPDF=()=>window.print();
window.shareShoppingWhatsApp=()=>{
  const text=shoppingList ? shoppingList.innerText : "";
  window.open("https://wa.me/?text="+encodeURIComponent("🛒 Lista DISPENSIA:\n\n"+text),"_blank");
};

/* ==== NAV ==== */
window.switchView=(v,btn)=>{
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  const view=document.getElementById("view-"+v);
  if(view) view.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  if(btn) btn.classList.add("active");
};
