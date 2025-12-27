/*****************************************************
 * DISPENSIA – VERSIÓN ESTABLE
 *****************************************************/

const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const feed = document.getElementById("feed");
const modal = document.getElementById("recipeModal");
const counter = document.getElementById("weekCounter");

let platos = [];
let ingredientes = [];
let pasos = [];
let week = [];
let currentPlate = null;

/* ===== CSV ===== */
function loadCSV(url) {
  return new Promise(resolve => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data)
    });
  });
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  platos = await loadCSV(PLATOS_URL);
  ingredientes = await loadCSV(ING_URL);
  pasos = await loadCSV(PASOS_URL);
  renderFeed();
  updateCounter();
});

/* ===== FEED ===== */
function renderFeed() {
  feed.innerHTML = "";

  platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <div class="card-actions">
            <button class="btn-secondary" onclick="openRecipe('${p.codigo}')">
              Ver receta
            </button>
            <button class="btn-primary" onclick="openRecipe('${p.codigo}')">
              Elegir plato
            </button>
          </div>
        </div>`;
      feed.appendChild(card);
    });
}

/* ===== MODAL ===== */
window.openRecipe = function (codigo) {
  const p = platos.find(x => x.codigo === codigo);
  if (!p) return;

  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";

  document.getElementById("videoFrame").src =
    p.youtube_id ? `https://www.youtube.com/embed/${p.youtube_id}` : "";

  document.getElementById("modalIngredients").innerHTML =
    ingredientes
      .filter(i => i.codigo_plato === codigo)
      .map(i => `<li>${i.ingrediente} (${i.cantidad || 1} ${i.unidad_medida || ""})</li>`)
      .join("");

  document.getElementById("modalSteps").innerHTML =
    pasos
      .filter(s => s.codigo === codigo)
      .sort((a,b) => a.orden - b.orden)
      .map(s => `<li>${s.indicacion}</li>`)
      .join("");

  modal.setAttribute("aria-hidden", "false");
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
};

/* Cerrar click fuera */
modal.addEventListener("click", e => {
  if (e.target === modal) closeRecipe();
});

/* ===== SEMANA ===== */
window.addCurrentPlate = function () {
  if (!currentPlate) return;
  if (!week.find(w => w.codigo === currentPlate.codigo)) {
    week.push(currentPlate);
    updateCounter();
  }
  closeRecipe();
};

function updateCounter() {
  counter.textContent = `${week.length} platos en tu semana`;
}
