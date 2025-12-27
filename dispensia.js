/*****************************************************
 * DISPENSIA – estable + Mi semana (lista) + compras
 *****************************************************/

// ✅ TUS 3 CSV (los que venías usando)
const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const STORAGE_KEY = "dispensia_week";

// DOM
const feed = document.getElementById("feed");
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");
const weekCounter = document.getElementById("weekCounter");
const modal = document.getElementById("recipeModal");
const closeBtn = document.getElementById("closeBtn");

// data
let platos = [];
let ingredientes = [];
let pasos = [];
let filtro = "all";

// state
let week = loadWeek();
let currentPlate = null;

/* ---------------- CSV LOADER (PapaParse) ---------------- */
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

/* ---------------- STORAGE ---------------- */
function loadWeek() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWeek() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  updateCounter();
  renderWeek();
  renderShopping();
}

/* ---------------- RENDER FEED ---------------- */
function render() {
  feed.innerHTML = "";

  const list = platos.filter(p => {
    // solo etapa 1 y 2
    if (!(p.etapa === "1" || p.etapa === "2")) return false;

    if (filtro === "all") return true;

    if (filtro === "rapido") {
      const t = Number(p["tiempo_preparacion(min)"] || 9999);
      return t <= 25;
    }

    return (p.tipo_plato || "").toLowerCase().includes(filtro);
  });

  if (list.length === 0) {
    feed.innerHTML = `<div style="padding:16px;color:#6b7280;">No hay platos para este filtro.</div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${IMG_BASE + p.imagen_archivo}" alt="${p.nombre_plato}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>${p["tiempo_preparacion(min)"]} min · ${p.porciones}</p>
        <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
      </div>
    `;
    feed.appendChild(card);
  });
}

/* ---------------- MODAL ---------------- */
window.openRecipe = function (codigo) {
  const p = platos.find(x => x.codigo === codigo);
  if (!p) return;

  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";

  const yt = (p.youtube_id || "").trim();
  document.getElementById("videoFrame").src = yt ? `https://www.youtube.com/embed/${yt}` : "";

  document.getElementById("modalIngredients").innerHTML =
    ingredientes
      .filter(i => i.codigo_plato === codigo)
      .map(i => `<li>${i.ingrediente}</li>`)
      .join("");

  document.getElementById("modalSteps").innerHTML =
    pasos
      .filter(s => s.codigo === codigo)
      .sort((a,b)=>Number(a.orden)-Number(b.orden))
      .map(s => `<li>${s.indicacion}</li>`)
      .join("");

  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
};

// ✅ botón X
closeBtn.addEventListener("click", () => window.closeRecipe());

// ✅ click fuera del modal box (para cerrar)
modal.addEventListener("click", (e) => {
  if (e.target === modal) window.closeRecipe();
});

/* ---------------- ADD / REMOVE (globales para onclick) ---------------- */
window.addCurrentPlate = function () {
  if (!currentPlate) return;

  // no duplicar
  if (!week.find(w => w.codigo === currentPlate.codigo)) {
    week.push(currentPlate);
    saveWeek();
  }

  // ✅ SIEMPRE CIERRA
  window.closeRecipe();
};

window.removeCurrentPlate = function () {
  if (!currentPlate) return;

  week = week.filter(w => w.codigo !== currentPlate.codigo);
  saveWeek();

  // ✅ SIEMPRE CIERRA
  window.closeRecipe();
};

window.removeFromWeek = function (codigo) {
  week = week.filter(w => w.codigo !== codigo);
  saveWeek();
};

/* ---------------- WEEK LIST ---------------- */
function renderWeek() {
  weekList.innerHTML = "";

  if (week.length === 0) {
    weekList.innerHTML = `<li style="justify-content:flex-start;color:#6b7280;">Aún no has agregado platos.</li>`;
    return;
  }

  week.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${p.nombre_plato}</span>
      <button onclick="removeFromWeek('${p.codigo}')">Quitar</button>
    `;
    weekList.appendChild(li);
  });
}

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

/* ---------------- SHOPPING LIST ---------------- */
function renderShopping() {
  shoppingList.innerHTML = "";
  const map = {};

  week.forEach(p => {
    ingredientes
      .filter(i => i.codigo_plato === p.codigo)
      .forEach(i => {
        const name = (i.ingrediente || "").trim();
        if (!name) return;

        const qty = Number(i.cantidad);
        map[name] = (map[name] || 0) + (isFinite(qty) && qty > 0 ? qty : 1);
      });
  });

  const entries = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    shoppingList.innerHTML = `<li style="justify-content:flex-start;color:#6b7280;">Agrega platos para ver tu lista.</li>`;
    return;
  }

  entries.forEach(([name, qty]) => {
    const li = document.createElement("li");
    li.textContent = `${name} — ${qty}`;
    shoppingList.appendChild(li);
  });
}

/* ---------------- FILTERS ---------------- */
document.getElementById("chips").onclick = e => {
  const f = e.target.dataset.filter;
  if (!f) return;

  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  e.target.classList.add("active");

  filtro = f;
  render();
};

/* ---------------- INIT ---------------- */
async function init() {
  try {
    platos = await fetchCSV(PLATOS_URL);
    ingredientes = await fetchCSV(ING_URL);
    pasos = await fetchCSV(PASOS_URL);

    render();
    renderWeek();
    renderShopping();
    updateCounter();
  } catch (err) {
    console.error("Error cargando CSV:", err);
    feed.innerHTML = `<div style="padding:16px;color:#991b1b;">
      Error cargando datos. Revisa consola.
    </div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
