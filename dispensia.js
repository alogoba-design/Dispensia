/*****************************************************
 * DISPENSIA – ESTABLE + SKELETON + MODAL OK
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
const modal = document.getElementById("recipeModal");
const weekCounter = document.getElementById("weekCounter");

let platos = [];
let ingredientes = [];
let pasos = [];
let week = loadWeek();
let currentPlate = null;

/* ================= CSV ================= */
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data),
      error: err => reject(err)
    });
  });
}

/* ================= SKELETON ================= */
function renderSkeletons(n = 8) {
  feed.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "card skeleton-card";
    s.innerHTML = `
      <div class="skeleton skeleton-img"></div>
      <div class="card-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `;
    feed.appendChild(s);
  }
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  renderSkeletons();

  platos = await fetchCSV(PLATOS_URL);
  ingredientes = await fetchCSV(ING_URL);
  pasos = await fetchCSV(PASOS_URL);

  renderFeed();
  updateCounter();

  document.getElementById("view-home")?.classList.add("active");
});

/* ================= FEED ================= */
function renderFeed() {
  feed.innerHTML = "";

  platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}" alt="${p.nombre_plato}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
        </div>
      `;
      feed.appendChild(card);
    });
}

/* ================= MODAL ================= */
window.openRecipe = function (codigo) {
  const p = platos.find(x => x.codigo === codigo);
  if (!p) return;

  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent =
    `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent =
    `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent =
    p.dificultad || "";

  document.getElementById("videoFrame").src =
    p.youtube_id
      ? `https://www.youtube.com/embed/${p.youtube_id}`
      : "";

  renderIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden", "false");
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
};

/* ================= INGREDIENTES ================= */
function normalizeCategory(tipo) {
  if (!tipo) return "Otros";
  const t = tipo.toLowerCase();
  if (t.includes("verd")) return "Verduras";
  if (t.includes("pollo") || t.includes("carne") || t.includes("pesc")) return "Carnes";
  if (t.includes("lact")) return "Lácteos";
  if (t.includes("abar") || t.includes("grano")) return "Abarrotes";
  if (t.includes("espec")) return "Especias";
  return "Otros";
}

function renderIngredients(codigo) {
  const ul = document.getElementById("modalIngredients");
  ul.innerHTML = "";

  const grouped = {};
  ingredientes
    .filter(i => i.codigo_plato === codigo)
    .forEach(i => {
      const cat = normalizeCategory(i.tipo_ingrediente);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(i);
    });

  Object.entries(grouped).forEach(([cat, items]) => {
    const t = document.createElement("li");
    t.innerHTML = `<strong>${cat}</strong>`;
    ul.appendChild(t);

    items.forEach(i => {
      const qty = i.cantidad || 1;
      const unit = i.unidad_medida ? ` ${i.unidad_medida}` : "";
      const li = document.createElement("li");
      li.textContent = `– ${i.ingrediente} (${qty}${unit})`;
      ul.appendChild(li);
    });
  });
}

/* ================= PASOS ================= */
function renderSteps(codigo) {
  const ol = document.getElementById("modalSteps");
  ol.innerHTML = "";

  pasos
    .filter(p => p.codigo === codigo)
    .sort((a,b) => Number(a.orden) - Number(b.orden))
    .forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.indicacion;
      ol.appendChild(li);
    });
}

/* ================= SEMANA ================= */
window.addCurrentPlate = function () {
  if (!currentPlate) return;

  if (!week.find(w => w.codigo === currentPlate.codigo)) {
    week.push(currentPlate);
    saveWeek();
  }

  closeRecipe();
};

function saveWeek() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  updateCounter();
}

function loadWeek() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}
