/*****************************************************
 * DISPENSIA – versión estable FINAL
 * ✔ Semana simple (contador + lista)
 * ✔ Compras funcionando
 * ✔ Filtros y receta OK
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

let platos = [];
let ingredientes = [];
let pasos = [];
let week = loadWeek();
let currentPlate = null;
let filtro = "all";

/* ================= CSV ================= */
function fetchCSV(url) {
  return new Promise(resolve => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data)
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

  chips.innerHTML = `<span class="chip active" data-filter="all">Todas</span>`;

  Array.from(set).sort().forEach(t => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.filter = t;
    chip.textContent = t;
    chips.appendChild(chip);
  });

  chips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filtro = chip.dataset.filter;
      renderFeed();
    });
  });
}

/* ================= FEED ================= */
function renderFeed() {
  feed.innerHTML = "";

  platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .filter(p => {
      if (filtro === "all") return true;
      if (filtro === "rapido") {
        return Number(p["tiempo_preparacion(min)"]) <= 25;
      }
      const tipos = (p.tipo_plato || "")
        .toLowerCase()
        .split(";")
        .map(t => t.trim());
      return tipos.includes(filtro);
    })
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}">
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
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";

  document.getElementById("videoFrame").src =
    p.youtube_id ? `https://www.youtube.com/embed/${p.youtube_id}` : "";

  renderRecipeIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden", "false");
  modal.querySelector(".modal-box").scrollTop = 0;
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
};

/* ================= RECETA INGREDIENTES ================= */
function renderRecipeIngredients(codigo) {
  const ul = document.getElementById("modalIngredients");
  ul.innerHTML = "";

  const grouped = {};

  ingredientes
    .filter(i => i.codigo_plato === codigo)
    .forEach(i => {
      const parte = (i.parte_del_plato || "Otros").trim();
      if (!grouped[parte]) grouped[parte] = [];
      grouped[parte].push(i);
    });

  Object.entries(grouped).forEach(([parte, items]) => {
    const title = document.createElement("li");
    title.innerHTML = `<strong>${parte}</strong>`;
    ul.appendChild(title);

    items.forEach(i => {
      const qty = i.cantidad || 1;
      const unit = i.unidad_medida ? ` ${i.unidad_medida}` : "";
      const obs = i.obs ? ` ${i.obs}` : "";
      const li = document.createElement("li");
      li.textContent = `– ${i.ingrediente} (${qty}${unit})${obs}`;
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
    .sort((a,b)=>a.orden-b.orden)
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

function renderWeek() {
  if (!weekList) return;
  weekList.innerHTML = "";

  week.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.nombre_plato;
    weekList.appendChild(li);
  });
}

/* ================= COMPRAS ================= */
function renderShopping() {
  if (!shoppingList) return;
  shoppingList.innerHTML = "";

  const grouped = {};

  week.forEach(p => {
    ingredientes
      .filter(i => i.codigo_plato === p.codigo)
      .forEach(i => {
        const cat = (i.tipo_ingrediente || "Otros").trim();
        const name = i.ingrediente.trim();
        const unit = (i.unidad_medida || "").trim();
        const key = unit ? `${name}__${unit}` : name;
        const qty = Number(i.cantidad) || 1;

        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][key]) grouped[cat][key] = { name, unit, qty: 0 };
        grouped[cat][key].qty += qty;
      });
  });

  Object.entries(grouped).forEach(([cat, items]) => {
    const block = document.createElement("div");
    block.innerHTML = `<h4>${cat}</h4>`;
    Object.values(items).forEach(i => {
      const row = document.createElement("div");
      row.textContent = `${i.name} – ${i.qty}${i.unit ? " " + i.unit : ""}`;
      block.appendChild(row);
    });
    shoppingList.appendChild(block);
  });
}

/* ================= STORAGE ================= */
function saveWeek() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  renderWeek();
  renderShopping();
  updateCounter();
}

function loadWeek() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

/* ================= CERRAR MODAL CLICK FUERA ================= */
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeRecipe();
});

