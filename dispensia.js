/*****************************************************
 * DISPENSIA – versión estable
 * ✔ Cards: "Ver plato"
 * ✔ Semana: agrega + contador + persistencia
 * ✔ Bottom-nav: cambia de vista DE VERDAD (oculta feed)
 * ✔ Filtros dinámicos desde tipo_plato (;)
 * ✔ Receta: ingredientes por parte_del_plato + obs
 * ✔ Compras: agrupado por tipo_ingrediente (suma por nombre+unidad)
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
const feed = document.getElementById("feed");               // tu grid/lista principal
const chips = document.getElementById("chips");             // contenedor de chips
const modal = document.getElementById("recipeModal");        // modal receta
const weekCounter = document.getElementById("weekCounter");  // contador header
const weekList = document.getElementById("weekList");        // ul semana
const shoppingList = document.getElementById("shoppingList");// div compras

const viewWeek = document.getElementById("view-week");
const viewShopping = document.getElementById("view-shopping");

let platos = [];
let ingredientes = [];
let pasos = [];

let week = loadWeek();          // [{codigo, nombre_plato, ...}]
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

/* ================= NAV (BOTTOM) =================
   Solución: cuando vas a Semana/Compras, ocultamos el feed
   para que realmente "traslade" a esa pantalla.
*/
window.switchView = function (view, btn) {
  // nav active
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // ocultar todo
  if (viewWeek) viewWeek.classList.remove("active");
  if (viewShopping) viewShopping.classList.remove("active");

  // mostrar según vista
  if (view === "home") {
    feed.style.display = ""; // vuelve a default
    if (viewWeek) viewWeek.classList.remove("active");
    if (viewShopping) viewShopping.classList.remove("active");
  } else if (view === "week") {
    feed.style.display = "none";
    if (viewWeek) viewWeek.classList.add("active");
    // asegurar que se vea arriba
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (view === "shopping") {
    feed.style.display = "none";
    if (viewShopping) viewShopping.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    platos = await fetchCSV(PLATOS_URL);
    ingredientes = await fetchCSV(ING_URL);
    pasos = await fetchCSV(PASOS_URL);
  } catch (e) {
    console.error("Error cargando Sheets:", e);
  }

  buildFiltersFromData();
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();

  // Por defecto, deja HOME
  feed.style.display = "";
});

/* ================= FILTROS (DINÁMICOS) =================
   Genera chips desde tipo_plato (separado por ;)
   + agrega chip "Rápidas" (rapido)
*/
function buildFiltersFromData() {
  if (!chips) return;

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

  Array.from(set)
    .sort()
    .forEach(t => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.dataset.filter = t;
      chip.textContent = t.charAt(0).toUpperCase() + t.slice(1);
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
  if (!feed) return;
  feed.innerHTML = "";

  const list = platos
    .filter(p => p.etapa === "1" || p.etapa === "2")
    .filter(p => {
      if (filtro === "all") return true;

      if (filtro === "rapido") {
        return Number(p["tiempo_preparacion(min)"]) <= 25;
      }

      const tipos = (p.tipo_plato || "")
        .toLowerCase()
        .split(";")
        .map(t => t.trim())
        .filter(Boolean);

      return tipos.includes(filtro);
    });

  if (!list.length) {
    feed.innerHTML = `<div style="padding:14px;opacity:.7">No hay platos para este filtro.</div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${IMG_BASE + p.imagen_archivo}" alt="${p.nombre_plato}">
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
  if (!p) return;
  currentPlate = p;

  const nameEl = document.getElementById("modalName");
  const timeEl = document.getElementById("modalTime");
  const porEl  = document.getElementById("modalPortions");
  const difEl  = document.getElementById("modalDifficulty");
  const frame  = document.getElementById("videoFrame");

  if (nameEl) nameEl.textContent = p.nombre_plato || "";
  if (timeEl) timeEl.textContent = `${p["tiempo_preparacion(min)"] || "-"} min`;
  if (porEl)  porEl.textContent  = `${p.porciones || "-"} porciones`;
  if (difEl)  difEl.textContent  = p.dificultad || "";

  if (frame) {
    frame.src = p.youtube_id ? `https://www.youtube.com/embed/${p.youtube_id}` : "";
  }

  renderRecipeIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden", "false");

  // Reinicia scroll interno del modal al abrir
  const box = modal.querySelector(".modal-box");
  if (box) box.scrollTop = 0;
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  const frame = document.getElementById("videoFrame");
  if (frame) frame.src = "";
  currentPlate = null;
};

// Cierra modal clic afuera
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeRecipe();
});

/* ================= RECETA INGREDIENTES
   Agrupados por parte_del_plato
   + obs al final si existe
*/
function renderRecipeIngredients(codigo) {
  const ul = document.getElementById("modalIngredients");
  if (!ul) return;
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
      const qty = (i.cantidad && String(i.cantidad).trim() !== "") ? i.cantidad : 1;
      const unit = (i.unidad_medida || "").trim();
      const unitTxt = unit ? ` ${unit}` : "";
      const obs = (i.obs || "").trim();
      const obsTxt = obs ? ` ${obs}` : "";

      const li = document.createElement("li");
      li.textContent = `– ${i.ingrediente} (${qty}${unitTxt})${obsTxt}`;
      ul.appendChild(li);
    });
  });
}

/* ================= PASOS ================= */
function renderSteps(codigo) {
  const ol = document.getElementById("modalSteps");
  if (!ol) return;
  ol.innerHTML = "";

  pasos
    .filter(p => p.codigo === codigo)
    .sort((a, b) => Number(a.orden) - Number(b.orden))
    .forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.indicacion || "";
      ol.appendChild(li);
    });
}

/* ================= SEMANA ================= */
window.addCurrentPlate = function () {
  if (!currentPlate) return;

  // Evita duplicados por codigo
  if (!week.some(w => w.codigo === currentPlate.codigo)) {
    week.push({
      codigo: currentPlate.codigo,
      nombre_plato: currentPlate.nombre_plato
    });
    saveWeek();
  } else {
    // igual actualiza UI por si acaso
    renderWeek();
    renderShopping();
    updateCounter();
  }

  closeRecipe();
};

function renderWeek() {
  if (!weekList) return;
  weekList.innerHTML = "";

  if (!week.length) {
    weekList.innerHTML = `<li style="opacity:.6">Aún no has agregado platos</li>`;
    return;
  }

  week.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.nombre_plato}
      <button onclick="removeFromWeek('${p.codigo}')">Quitar</button>
    `;
    weekList.appendChild(li);
  });
}

window.removeFromWeek = function (codigo) {
  week = week.filter(w => w.codigo !== codigo);
  saveWeek();
};

/* ================= COMPRAS (tipo_ingrediente) ================= */
function renderShopping() {
  if (!shoppingList) return;
  shoppingList.innerHTML = "";

  if (!week.length) {
    shoppingList.innerHTML = `<div style="opacity:.6">Agrega platos para ver tu lista de compras.</div>`;
    return;
  }

  const grouped = {};

  week.forEach(wp => {
    // buscar el plato completo para poder filtrar ingredientes
    const platoFull = platos.find(p => p.codigo === wp.codigo);
    if (!platoFull) return;

    ingredientes
      .filter(i => i.codigo_plato === platoFull.codigo)
      .forEach(i => {
        const cat = (i.tipo_ingrediente || "Otros").trim();
        const name = (i.ingrediente || "").trim();
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
    block.className = "shopping-category";
    block.innerHTML = `<div class="shopping-category-title">${cat}</div>`;

    Object.values(items).forEach(i => {
      const unitTxt = i.unit ? ` ${i.unit}` : "";
      const row = document.createElement("div");
      row.className = "shopping-item";
      row.innerHTML = `<span>${i.name}</span><span>${i.qty}${unitTxt}</span>`;
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
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function updateCounter() {
  if (!weekCounter) return;
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

