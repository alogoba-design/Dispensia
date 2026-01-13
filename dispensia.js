const PLATOS_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const PASOS_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE="assets/img/";
const STORAGE="dispensia_week";

let platos=[],ingredientes=[],pasos=[];
let week=JSON.parse(localStorage.getItem(STORAGE))||[];
let currentPlate=null;
let filtro="all";

/* ===== CSV ===== */
function loadCSV(url){
  return new Promise(res=>{
    Papa.parse(url,{
      download:true,
      header:true,
      skipEmptyLines:true,
      complete:r=>res(r.data)
    });
  });
}

/* ===== INIT ===== */
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

/* ===== NAV ===== */
window.switchView=function(v,btn){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  document.getElementById("view-"+v).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  if(btn) btn.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
};

function goHome(){
  switchView("home",document.getElementById("navHome"));
}

/* ===== FILTERS ===== */
function buildFilters(){
  const chips=document.getElementById("chips");
  const set=new Set();

  platos.forEach(p=>{
    (p.tipo_plato||"").split(";").map(t=>t.trim()).filter(Boolean).forEach(t=>set.add(t));
  });

  chips.innerHTML=`<span class="chip active" data-f="all">Todas</span>`;
  [...set].sort().forEach(t=>{
    const c=document.createElement("span");
    c.className="chip";
    c.dataset.f=t;
    c.textContent=t;
    chips.appendChild(c);
  });

  chips.querySelectorAll(".chip").forEach(ch=>{
    ch.addEventListener("click",()=>{
      chips.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      ch.classList.add("active");
      filtro=ch.dataset.f;
      renderFeed();
    });
  });
}

/* ===== FEED ===== */
function renderFeed(){
  const feed=document.getElementById("feed");
  feed.innerHTML="";

  platos
    .filter(p=>p.etapa==="1"||p.etapa==="2")
    .filter(p=>filtro==="all"||(p.tipo_plato||"").includes(filtro))
    .forEach(p=>{
      const card=document.createElement("div");
      card.className="card";
      card.innerHTML=`
        <img src="${IMG_BASE+p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <button type="button">Ver plato</button>
        </div>`;
      card.querySelector("button").onclick=()=>openRecipe(p.codigo);
      feed.appendChild(card);
    });
}

/* ===== MODAL ===== */
window.openRecipe=function(c){
  currentPlate=platos.find(p=>p.codigo===c);
  if(!currentPlate) return;

  document.getElementById("modalName").textContent=currentPlate.nombre_plato;
  document.getElementById("modalTime").textContent=(currentPlate["tiempo_preparacion(min)"]||"-")+" min";
  document.getElementById("modalPortions").textContent=(currentPlate.porciones||"-")+" porciones";
  document.getElementById("modalDifficulty").textContent=currentPlate.dificultad||"";

  document.getElementById("videoFrame").src=currentPlate.youtube_id
    ? "https://www.youtube.com/embed/"+currentPlate.youtube_id
    : "";

  renderRecipeIngredients(c);
  renderSteps(c);

  document.getElementById("recipeModal").setAttribute("aria-hidden","false");
  document.querySelector(".modal-box").scrollTop=0;
};

window.closeRecipe=function(){
  document.getElementById("recipeModal").setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
};

/* ===== CLICK FUERA ===== */
document.getElementById("recipeModal").addEventListener("click",e=>{
  if(e.target.id==="recipeModal") closeRecipe();
});

/* ===== RECETA ===== */
function renderRecipeIngredients(c){
  const ul=document.getElementById("modalIngredients");
  ul.innerHTML="";
  ingredientes.filter(i=>i.codigo_plato===c).forEach(i=>{
    ul.innerHTML+=`<li>${i.ingrediente} (${i.cantidad||1} ${i.unidad_medida||""}) ${i.obs||""}</li>`;
  });
}

function renderSteps(c){
  const ol=document.getElementById("modalSteps");
  ol.innerHTML="";
  pasos.filter(p=>p.codigo===c).forEach(p=>{
    ol.innerHTML+=`<li>${p.indicacion||""}</li>`;
  });
}

/* ===== AGREGAR A SEMANA (FIX DESKTOP) ===== */
window.addCurrentPlate=function(){
  if(!currentPlate) return;

  if(!week.some(w=>w.codigo===currentPlate.codigo)){
    week.push({codigo:currentPlate.codigo,nombre:currentPlate.nombre_plato});
    localStorage.setItem(STORAGE,JSON.stringify(week));
  }

  renderWeek();
  renderShopping();
  updateCounter();
  closeRecipe();
  setTimeout(goHome,50);
};

/* 🔥 FIX CLICK DESKTOP */
document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-add-week]");
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  addCurrentPlate();
});

/* ===== WEEK ===== */
function renderWeek(){
  const el=document.getElementById("weekList");
  el.innerHTML="";
  week.forEach((p,i)=>{
    el.innerHTML+=`
      <div class="week-card">
        <span>${p.nombre}</span>
        <button type="button" onclick="removeWeek(${i})">Quitar</button>
      </div>`;
  });
}

window.removeWeek=function(i){
  week.splice(i,1);
  localStorage.setItem(STORAGE,JSON.stringify(week));
  renderWeek();
  renderShopping();
  updateCounter();
};

/* ===== SHOPPING ===== */
function renderShopping(){
  const tbody=document.getElementById("shoppingList");
  tbody.innerHTML="";
  const map={};

  week.forEach(w=>{
    ingredientes.filter(i=>i.codigo_plato===w.codigo).forEach(i=>{
      const cat=(i.tipo_ingrediente||"Otros").trim();
      const ing=(i.ingrediente||"").trim();
      const unit=(i.unidad_reg||"").trim();
      const qty=Number(i.cantidad_reg)||0;

      const key=`${cat}|${ing}|${unit}`;
      if(!map[key]) map[key]={cat,ing,unit,qty:0};
      map[key].qty+=qty;
    });
  });

  Object.values(map)
    .sort((a,b)=>a.cat.localeCompare(b.cat)||b.qty-a.qty)
    .forEach(r=>{
      tbody.innerHTML+=`
        <tr>
          <td>${r.cat}</td>
          <td>${r.ing}</td>
          <td>${r.unit}</td>
          <td style="text-align:right">${r.qty.toFixed(2)}</td>
        </tr>`;
    });
}

/* ===== COUNTER ===== */
function updateCounter(){
  document.getElementById("weekCounter").textContent=`${week.length} platos en tu semana`;
}