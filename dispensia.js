/*****************************************************
 * DISPENSIA – versión estable
 * ✔ Receta: cantidad + unidad_medida (NO cambia)
 * ✔ Compras: cantidad_reg + unidad_reg (CAMBIO)
 *****************************************************/

const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const STORAGE_KEY = "dispensia_week";

/* DOM */
const feed = document.getElementById("feed");
const chips = document.getElementById("chips");
const modal = document.getElementById("recipeModal");
const weekCounter = document.getElementById("weekCounter");
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");

const viewWeek = document.getElementById("view-week");
const viewShopping = document.getElementById("view-shopping");

let platos = [];
let ingredientes = [];
let pasos = [];
let week = loadWeek();
let currentPlate = null;
let filtro = "all";

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

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  platos = await fetchCSV(PLATOS_URL);
  ingredientes = await fetchCSV(ING_URL);
  pasos = await fetchCSV(PASOS_URL);

  buildFiltersFromData();
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();
});

/* ================= FILTROS ================= */
function buildFiltersFromData() {
  const set = new Set();

  platos.forEach(p => {
    (p.tipo_plato || "")
      .toLowerCase()
      .split(";")
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(t => set.add(t));
  });

  chips.innerHTML = `
    <span class="chip active" data-filter="all">Todas</span>
    <span class="chip" data-filter="rapido">Rápidas</span>
  `;

  Array.from(set).sort().forEach(t => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.filter = t;
    chip.textContent = t;
    chips.appendChild(chip);
  });

  chips.querySelectorAll(".chip").forEach(chip => {
    chip.onclick = () => {
      chips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filtro = chip.dataset.filter;
      renderFeed();
    };
  });
}

/* ================= FEED ================= */
function renderFeed() {
  feed.innerHTML = "";

  platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .filter(p => {
      if (filtro === "all") return true;
      if (filtro === "rapido") return Number(p["tiempo_preparacion(min)"]) <= 25;
      return (p.tipo_plato || "").toLowerCase().split(";").includes(filtro);
    })
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <button onclick="openRecipe('${p.codigo}')">Ver plato</button>
        </div>
      `;
      feed.appendChild(card);
    });
}

/* ================= MODAL ================= */
window.openRecipe = function (codigo) {
  const p = platos.find(x => x.codigo === codigo);
  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";
  document.getElementById("videoFrame").src =
    p.youtube_id ? `https://www.youtube.com/embed/${p.youtube_id}` : "";

  renderRecipeIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden", "false");
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
};

/* ================= RECETA ================= */
function renderRecipeIngredients(codigo) {
  const ul = document.getElementById("modalIngredients");
  ul.innerHTML = "";

  const grouped = {};

  ingredientes
    .filter(i => i.codigo_plato === codigo)
    .forEach(i => {
      const parte = i.parte_del_plato || "Otros";
      if (!grouped[parte]) grouped[parte] = [];
      grouped[parte].push(i);
    });

  Object.entries(grouped).forEach(([parte, items]) => {
    ul.innerHTML += `<li><strong>${parte}</strong></li>`;
    items.forEach(i => {
      const qty = i.cantidad || 1;
      const unit = i.unidad_medida ? ` ${i.unidad_medida}` : "";
      const obs = i.obs ? ` ${i.obs}` : "";
      ul.innerHTML += `<li>– ${i.ingrediente} (${qty}${unit})${obs}</li>`;
    });
  });
}

/* ================= PASOS ================= */
function renderSteps(codigo) {
  const ol = document.getElementById("modalSteps");
  ol.innerHTML = "";

  pasos
    .filter(p => p.codigo === codigo)
    .sort((a,b)=>a.orden-b.orden)
    .forEach(p => {
      ol.innerHTML += `<li>${p.indicacion}</li>`;
    });
}

/* ================= SEMANA ================= */
window.addCurrentPlate = function () {
  if (!week.some(w => w.codigo === currentPlate.codigo)) {
    week.push({
      codigo: currentPlate.codigo,
      nombre_plato: currentPlate.nombre_plato
    });
    saveWeek();
  }
  closeRecipe();
};

/* ================= COMPRAS (USA *_reg) ================= */
function renderShopping() {
  shoppingList.innerHTML = "";

  if (!week.length) {
    shoppingList.innerHTML = `<div style="opacity:.6">Agrega platos para ver tu lista.</div>`;
    return;
  }

  const grouped = {};

  week.forEach(wp => {
    ingredientes
      .filter(i => i.codigo_plato === wp.codigo)
      .forEach(i => {
        const cat = i.tipo_ingrediente || "Otros";
        const name = i.ingrediente.trim();
        const unit = (i.unidad_reg || "").trim();
        const key = unit ? `${name}__${unit}` : name;
        const qty = Number(i.cantidad_reg) || 1;

        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][key]) grouped[cat][key] = { name, unit, qty: 0 };

        grouped[cat][key].qty += qty;
      });
  });

  Object.entries(grouped).forEach(([cat, items]) => {
    shoppingList.innerHTML += `<div class="shopping-category-title">${cat}</div>`;
    Object.values(items).forEach(i => {
      const unitTxt = i.unit ? ` ${i.unit}` : "";
      shoppingList.innerHTML += `
        <div class="shopping-item">
          <span>${i.name}</span>
          <span>${i.qty}${unitTxt}</span>
        </div>`;
    });
  });
}

/* ================= STORAGE ================= */
function saveWeek() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  renderShopping();
  updateCounter();
}

function loadWeek() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

