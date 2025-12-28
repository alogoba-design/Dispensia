const SHEET_PLATOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const SHEET_ING =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const SHEET_PASOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const feed = document.getElementById("feed");
const modal = document.getElementById("recipeModal");

let platos = [];
let ingredientes = [];
let pasos = [];
let filtro = "all";
let weekCount = 0;
let currentPlate = null;

/* CSV */
async function fetchCSV(url) {
  const res = await fetch(url);
  const txt = await res.text();
  const lines = txt.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const cols = l.split(",");
    const obj = {};
    headers.forEach((h,i) => obj[h] = cols[i] || "");
    return obj;
  });
}

async function loadData() {
  platos = await fetchCSV(SHEET_PLATOS);
  ingredientes = await fetchCSV(SHEET_ING);
  pasos = await fetchCSV(SHEET_PASOS);
  renderFeed();
}

function renderFeed() {
  feed.innerHTML = "";
  platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .filter(p => {
      if (filtro === "all") return true;
      if (filtro === "rapido") return Number(p["tiempo_preparacion(min)"]) <= 25;
      return (p.tipo_plato || "").toLowerCase().includes(filtro);
    })
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
        </div>`;
      feed.appendChild(card);
    });
}

window.openRecipe = function(codigo) {
  const p = platos.find(x => x.codigo === codigo);
  if (!p) return;
  currentPlate = p;

  modal.querySelector(".modal-box").scrollTop = 0;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";

  document.getElementById("videoFrame").src =
    p.youtube_id ? `https://www.youtube.com/embed/${p.youtube_id}` : "";

  document.getElementById("modalIngredients").innerHTML =
    ingredientes.filter(i => i.codigo_plato === codigo)
      .map(i => `<li>${i.ingrediente}</li>`).join("");

  document.getElementById("modalSteps").innerHTML =
    pasos.filter(s => s.codigo === codigo)
      .sort((a,b)=>a.orden-b.orden)
      .map(s => `<li>${s.indicacion}</li>`).join("");

  modal.setAttribute("aria-hidden","false");
};

window.closeRecipe = function() {
  document.getElementById("videoFrame").src = "";
  modal.setAttribute("aria-hidden","true");
};

modal.addEventListener("click", e => {
  if (e.target === modal) closeRecipe();
});

window.addCurrentPlate = function() {
  weekCount++;
  document.getElementById("weekCount").textContent =
    `${weekCount} platos en tu semana`;
  closeRecipe();
};

/* FILTERS */
document.getElementById("chips").addEventListener("click", e => {
  if (!e.target.classList.contains("chip")) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  e.target.classList.add("active");
  filtro = e.target.dataset.filter;
  renderFeed();
});

loadData();

