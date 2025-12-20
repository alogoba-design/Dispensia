/*****************************************************
 * DISPENSIA – código final conectado a tus 3 sheets
 *****************************************************/

const SHEET_PLATOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const SHEET_ING_URL    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const SHEET_PASOS_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const feedEl = document.getElementById("gallery");
const modalEl  = document.getElementById("recipeModal");

let platos = [], ingredientes = [], pasos = [];
let filtro = "all";

/* ================= CSV PARSE GENERAL ================= */
async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const header = lines.shift().split(",");
  return lines.map(r => {
    const cols = r.split(",");
    const obj = {};
    header.forEach((h,i) => obj[h] = cols[i] ? cols[i].trim() : "");
    return obj;
  });
}

/* ================= LOAD ALL DATA ================= */
async function loadData() {
  platos = await fetchCSV(SHEET_PLATOS_URL);
  ingredientes = await fetchCSV(SHEET_ING_URL);
  pasos = await fetchCSV(SHEET_PASOS_URL);
  renderFeed();
}

/* ========== FILTER UTILS ========== */
function parseTags(str) {
  return str.split(",").map(s => s.trim().toLowerCase());
}

function isEtapa12(etapa) {
  return etapa === "1" || etapa === "2";
}

function isRapido(row) {
  const t = Number(row["tiempo_preparacion(min)"]);
  return t <= 25;
}

function matchesFilter(r) {
  if (filtro === "all") return isEtapa12(r.etapa);
  if (filtro === "rapido") return isEtapa12(r.etapa) && isRapido(r);
  return isEtapa12(r.etapa) && parseTags(r.tipo_plato).includes(filtro);
}

/* ========== RENDER FEED ========== */
function renderFeed() {
  feedEl.innerHTML = "";
  const list = platos.filter(matchesFilter);

  if (list.length === 0) {
    feedEl.innerHTML = `<div style="padding:14px;color:#6b7280;">No hay platos para este filtro.</div>`;
    return;
  }

  list.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${IMG_BASE + r.imagen_archivo}" alt="${r.nombre_plato}">
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

/* ========== MODAL ========== */
function openRecipe(codigo) {
  const r = platos.find(p => p.codigo === codigo);
  if (!r) return;

  document.getElementById("modalName").textContent = r.nombre_plato;
  document.getElementById("modalTime").textContent = `⏱ ${r["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `🍽 ${r.porciones}`;
  document.getElementById("modalDifficulty").textContent = r.dificultad || "";

  // youtube
  document.getElementById("videoFrame").src = `https://www.youtube.com/embed/${r.youtube_id}`;

  // ingredientes de este plato
  const ingList = ingredientes
    .filter(i => i.codigo_plato === r.codigo)
    .map(i => `<li>${i.ingrediente} — ${i.cantidad || "-"}</li>`)
    .join("");
  document.getElementById("modalIngredients").innerHTML = ingList;

  // pasos ordenados
  const pasosList = pasos
    .filter(p => p.codigo === r.codigo)
    .sort((a,b) => Number(a.orden) - Number(b.orden))
    .map(p => `<li>${p.indicacion}</li>`)
    .join("");
  document.getElementById("modalSteps").innerHTML = pasosList;

  modalEl.style.display = "flex";
}

function closeRecipe() {
  document.getElementById("videoFrame").src = "";
  modalEl.style.display = "none";
}

/* ================= FILTER HANDLER ================= */
document.getElementById("chips").addEventListener("click", (e) => {
  if (!e.target.classList.contains("chip")) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  e.target.classList.add("active");
  filtro = e.target.dataset.filter;
  renderFeed();
});

/* ================= INITIALIZE ================= */
loadData();
