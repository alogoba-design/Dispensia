/* ======================= DATOS ======================= */
const URL_PLATOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const URL_ING    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const URL_PASOS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_PATH = "assets/img/";

/* ======================= CSV PARSER ======================= */
async function csv(u){
  const t=await (await fetch(u)).text();
  const r=t.split("\n").map(x=>x.split(","));
  const head=r.shift();
  return r.map(x=>Object.fromEntries(x.map((v,i)=>[head[i],v.trim()])));
}

let PLATOS=[], ING=[], PASOS=[];

/* ======================= INIT ======================= */
async function init(){
  PLATOS = await csv(URL_PLATOS);
  ING    = await csv(URL_ING);
  PASOS  = await csv(URL_PASOS);
  renderMeals();
}
init();

/* ======================= RENDER CARDS ======================= */
function getMealImage(p){
  if(p.imagen_archivo && p.imagen_archivo.trim()!=="")
    return `${IMG_PATH}${p.imagen_archivo.trim()}`;
  return `${IMG_PATH}${p.codigo}.jpg`;
}

function renderMeals(){
  const target=document.getElementById("catalog");
  target.innerHTML="";
  PLATOS.forEach(p=>{
    target.innerHTML+=`
      <div class="card" onclick="openRecipe('${p.codigo}')">
        <img src="${getMealImage(p)}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <p>${p["tiempo_preparacion(min)"]} min • ${p.porciones} porciones</p>
          <button>Ver receta</button>
        </div>
      </div>
    `;
  });
}

/* ======================= MODAL ======================= */
function openRecipe(id){
  renderRecipe(id);
  recipeModal.classList.add("active");
}

function renderRecipe(id){
  const r = PLATOS.find(x=>x.codigo===id);
  modalName.textContent=r.nombre_plato;
  modalTime.textContent=r["tiempo_preparacion(min)"]+" min";
  modalPortions.textContent=r.porciones+" porciones";

  /* video */
  recipeVideo.src=`https://www.youtube.com/embed/${r.youtube_id}?autoplay=1`;

  /* ingredientes */
  modalIngredients.innerHTML =
    ING.filter(i=>i.codigo_plato===id)
      .map(i=>`<li>${i.ingrediente} — ${i.cantidad||"-"}</li>`).join("");

  /* pasos */
  modalSteps.innerHTML =
    PASOS.filter(p=>p.codigo===id)
      .sort((a,b)=>a.orden-b.orden)
      .map(p=>`<li>${p.indicacion}</li>`).join("");
}

function closeRecipe(){
  recipeModal.classList.remove("active");
  recipeVideo.src="";
}
