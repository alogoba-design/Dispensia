/* ===================== DATA ===================== */
const URL_PLATOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const URL_ING    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const URL_PASOS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_PATH = "assets/img/";

/* ================= CSV PARSER ================= */
async function csv(url){
  const t = await (await fetch(url)).text();
  const rows=t.split("\n").map(r=>r.split(","));
  const h=rows.shift();
  return rows.map(r=>Object.fromEntries(r.map((v,i)=>[h[i],v.trim()])));
}

/* ================= INIT ================= */
let PLATOS=[],ING=[],PASOS=[];
init();
async function init(){
  PLATOS=await csv(URL_PLATOS);
  ING=await csv(URL_ING);
  PASOS=await csv(URL_PASOS);
  renderMeals();
}

/* ================= GALLERY ================= */
function renderMeals(){
  let html="";
  PLATOS.forEach(p=>{
    html+=`
    <div class="card" onclick="openRecipe('${p.codigo}')">
      <img src="${IMG_PATH+(p.imagen_archivo||p.codigo+'.jpg')}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>${p["tiempo_preparacion(min)"]} min • ${p.porciones} porciones</p>
        <button>Ver receta</button>
      </div>
    </div>`;
  });
  gallery.innerHTML=html;
}

/* ================= MODAL ================= */
function openRecipe(id){
  const r=PLATOS.find(x=>x.codigo===id);

  recipeModal.style.display="flex";
  modalName.textContent=r.nombre_plato;
  modalTime.textContent=r["tiempo_preparacion(min)"]+" min";
  modalPortions.textContent=r.porciones+" porciones";

  recipeVideo.src="https://www.youtube.com/embed/"+r.youtube_id+"?autoplay=1";

  modalIngredients.innerHTML = ING.filter(x=>x.codigo_plato===id)
     .map(x=>`<li>${x.ingrediente} — ${x.cantidad||"-"}</li>`).join("");

  modalSteps.innerHTML = PASOS.filter(x=>x.codigo===id)
     .sort((a,b)=>a.orden-b.orden)
     .map(x=>`<li>${x.indicacion}</li>`).join("");
}

function closeRecipe(){
  recipeModal.style.display="none";
  recipeVideo.src=""; // detener video
}
