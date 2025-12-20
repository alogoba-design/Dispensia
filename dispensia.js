/*****************************************************
 * DISPENSIA – FIX DEFINITIVO CSV + RENDER
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

let platos = [];
let ingredientes = [];
let pasos = [];
let filtro = "all";

/* ================= CSV LOAD (PAPAPARSE) ================= */
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
}

/* ================= FILTERS ================= */
function isEtapa12(e) {
  return e === "1" || e === "2";
}

function isRapido(r) {
  return Number(r["tiempo_preparacion(min)"]) <= 25;
}

function matchesFilter(r) {
  if (!isEtapa12(r.etapa)) return false;
  if (filtro === "all") return true;
  if (filtro === "rapido") return isRapido(r);
  return r.tipo_plato?.toLowerCase().includes(filtro);
}

/* ================= RENDER ================= */
function renderFeed() {
  feedEl.innerHTML = "";
  const list = platos.filter(matchesFilter);

  if (!list.length) {
    feedEl.innerHTML =
      "<p style='color:#6b7280'>No hay platos para este filtro</p>";
    return;
  }

  list.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${IMG_BASE + r.imagen_archivo}">
      <div class="card-body">
        <h3>${r.nombre_plato}</h3>
        <p>⏱ ${r["tiempo_preparacion(min)"]} min · 🍽 ${r.porciones}</p>
        <div class="card-actions">
          <button class="primary" onclick="openRecipe('${r.codigo}')">Elegir plato</button>
          <button class="secondary" onclick="openRecipe('${r.codigo}')">Ver receta</button>
        </div>
      </div>`;
    feedEl.appendChild(card);
  });
}

/* ================= MODAL ================= */
function openRecipe(codigo) {
  const r = platos.find(p => p.codigo === codigo);
  if (!r) return;

  document.getElementById("modalName").textContent = r.nombre_plato;
  document.getElementById("modalTime").textContent =
    `${r["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent =
    `${r.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = r.dificultad;

  document.getElementById("videoFrame").src =
    `https://www.youtube.com/embed/${r.youtube_id}`;

  document.getElementById("modalIngredients").innerHTML =
    ingredientes
      .filter(i => i.codigo_plato === codigo)
      .map(i => `<li>${i.ingrediente} – ${i.cantidad || ""}</li>`)
      .join("");

  document.getElementById("modalSteps").innerHTML =
    pasos
      .filter(p => p.codigo === codigo)
      .sort((a,b)=>a.orden-b.orden)
      .map(p => `<li>${p.indicacion}</li>`)
      .join("");

  modalEl.style.display = "flex";
}

document.getElementById("closeBtn").onclick = () => {
  modalEl.style.display = "none";
  document.getElementById("videoFrame").src = "";
};

/* ================= CHIPS ================= */
document.getElementById("chips").onclick = e => {
  if (!e.target.classList.contains("chip")) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  e.target.classList.add("active");
  filtro = e.target.dataset.filter;
  renderFeed();
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadData);
