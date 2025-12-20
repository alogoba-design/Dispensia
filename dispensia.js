const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const FEED = document.getElementById("feed");
const SHEET = document.getElementById("sheet");

let DATA = [];
let FILTER = "all";

/* CSV PARSER ROBUSTO */
async function loadCSV(){
  const text = await (await fetch(SHEET_URL)).text();
  const rows = text.trim().split("\n");
  const headers = rows.shift().split("\t");

  return rows.map(r=>{
    const cols = r.split("\t");
    const o = {};
    headers.forEach((h,i)=>o[h]=cols[i]);
    return o;
  });
}

/* RENDER FEED */
function render(){
  FEED.innerHTML="";
  DATA
    .filter(r=>["1","2"].includes(r.etapa))
    .filter(r=>{
      if(FILTER==="all") return true;
      return r.tipo_plato?.includes(FILTER);
    })
    .forEach(r=>{
      const card=document.createElement("div");
      card.className="card";
      card.innerHTML=`
        <img src="assets/img/${r.imagen_archivo}">
        <div class="card-body">
          <h3>${r.nombre_plato}</h3>
          <p>⏱ ${r.tiempo_preparacion(min)} min · 🍽 ${r.porciones}</p>
          <div class="card-actions">
            <button class="primary" onclick="openRecipe('${r.codigo}')">Elegir plato</button>
            <button class="secondary" onclick="openRecipe('${r.codigo}')">Ver receta</button>
          </div>
        </div>`;
      FEED.appendChild(card);
    });
}

/* FILTRO */
function setFilter(f,el){
  FILTER=f;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  el.classList.add("active");
  render();
}

/* MODAL */
function openRecipe(codigo) {
  const r = DATA.find(x => x.codigo === codigo);
  if (!r) return;

  // Título
  document.getElementById("modalName").textContent = r.nombre_plato;

  // Meta
  document.getElementById("modalTime").textContent =
    `⏱ ${r["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent =
    `🍽 ${r.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent =
    r.dificultad;

  // Video YouTube
  document.getElementById("modalVideoContainer").innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${r.youtube_id}"
      frameborder="0"
      allowfullscreen>
    </iframe>
  `;

  // Imagen fallback
  document.getElementById("modalImg").src =
    `assets/img/${r.imagen_archivo}`;

  // Ingredientes (temporal si aún no conectamos hoja de ingredientes)
  document.getElementById("modalIngredients").innerHTML =
    "<li>(Ingredientes vendrán de la siguiente hoja)</li>";

  // Pasos (temporal)
  document.getElementById("modalSteps").innerHTML =
    "<li>(Preparación vendrá de la siguiente hoja)</li>";

  // Mostrar modal
  document.getElementById("recipeModal").style.display = "flex";
}


function closeRecipe() {
  document.getElementById("recipeModal").style.display = "none";
  document.getElementById("modalVideoContainer").innerHTML = "";
}


/* INIT */
(async()=>{
  DATA = await loadCSV();
  render();
})();
