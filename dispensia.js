/*****************************************************
 * DISPENSIA – App UX refinado + Bottom Nav funcional
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
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");
const weekCounter = document.getElementById("weekCounter");
const modal = document.getElementById("recipeModal");

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

/* ================= NAV (BOTTOM) ================= */
/**
 * index.html llama: switchView('home'|'week'|'shopping', this)
 */
window.switchView = function (view, btn) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // opcional: sube al inicio de la vista (se siente más "app")
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  platos = await fetchCSV(PLATOS_URL);
  ingredientes = await fetchCSV(ING_URL);
  pasos = await fetchCSV(PASOS_URL);

  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();

  // Asegura que INICIO sea visible al cargar
  const homeView = document.getElementById("view-home");
  if (homeView) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    homeView.classList.add("active");
  }
});

/* ================= FEED ================= */
function renderFeed() {
  if (!feed) return;
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

  renderIngredients(codigo);
  renderSteps(codigo);

  modal.setAttribute("aria-hidden", "false");
};

window.closeRecipe = function () {
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
};

/* ================= INGREDIENTES (pocas categorías + unidad) ================= */
function normalizeCategory(tipo) {
  if (!tipo) return "Otros";
  const t = tipo.toLowerCase();

  if (t.includes("verd")) return "Verduras";
  if (t.includes("carne") || t.includes("pollo") || t.includes("pesc")) return "Carnes";
  if (t.includes("lact")) return "Lácteos";
  if (t.includes("abar") || t.includes("grano") || t.includes("pasta")) return "Abarrotes";
  if (t.includes("espec") || t.includes("condim")) return "Especias";

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
    const title = document.createElement("li");
    title.innerHTML = `<strong>${cat}</strong>`;
    ul.appendChild(title);

    items.forEach(i => {
      const qty = (i.cantidad && String(i.cantidad).trim() !== "") ? i.cantidad : 1;
      const unit = (i.unidad_medida || "").trim();
      const unitTxt = unit ? ` ${unit}` : "";
      const li = document.createElement("li");
      li.textContent = `– ${i.ingrediente} (${qty}${unitTxt})`;
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
    .sort((a, b) => Number(a.orden) - Number(b.orden))
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

  // Opcional: al agregar, te lleva a Semana (se siente "app")
  const weekBtn = document.querySelector(".bottom-nav .nav-item:nth-child(2)");
  if (weekBtn) switchView("week", weekBtn);
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

/* ================= COMPRAS (pocas categorías + unidad) ================= */
function renderShopping() {
  if (!shoppingList) return;
  shoppingList.innerHTML = "";

  if (!week.length) {
    shoppingList.innerHTML = `<div style="opacity:.6; padding:16px;">Agrega platos para ver tu lista.</div>`;
    return;
  }

  const grouped = {}; // cat -> name -> {qty, unit}

  week.forEach(p => {
    ingredientes
      .filter(i => i.codigo_plato === p.codigo)
      .forEach(i => {
        const cat = normalizeCategory(i.tipo_ingrediente);
        const name = (i.ingrediente || "").trim();
        if (!name) return;

        const qty = (i.cantidad && String(i.cantidad).trim() !== "") ? Number(i.cantidad) : 1;
        const unit = (i.unidad_medida || "").trim();

        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][name]) grouped[cat][name] = { qty: 0, unit };

        grouped[cat][name].qty += isNaN(qty) ? 1 : qty;

        // Si viene unidad y antes no había, guárdala
        if (!grouped[cat][name].unit && unit) grouped[cat][name].unit = unit;
      });
  });

  Object.entries(grouped).forEach(([cat, items]) => {
    const block = document.createElement("div");
    block.className = "shopping-category";

    const title = document.createElement("div");
    title.className = "shopping-category-title";
    title.textContent = cat;
    block.appendChild(title);

    Object.entries(items).forEach(([name, data]) => {
      const row = document.createElement("div");
      row.className = "shopping-item";
      const unitTxt = data.unit ? ` ${data.unit}` : "";
      row.innerHTML = `<span>${name}</span><span>${data.qty}${unitTxt}</span>`;
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
  if (weekCounter) weekCounter.textContent = `${week.length} platos en tu semana`;
}
