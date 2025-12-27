/*****************************************************
 * DISPENSIA – Microinteracciones (HF-like) + estabilidad
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

/* ===== Toast ===== */
let toastEl = null;
function ensureToast(){
  if (toastEl) return;
  toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.id = "toast";
  document.body.appendChild(toastEl);
}
function showToast(msg){
  ensureToast();
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.classList.remove("show"), 1800);
}

/* CSV */
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

/* NAV */
window.switchView = function (view, btn) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* INIT */
document.addEventListener("DOMContentLoaded", async () => {
  platos = await fetchCSV(PLATOS_URL);
  ingredientes = await fetchCSV(ING_URL);
  pasos = await fetchCSV(PASOS_URL);

  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();

  document.getElementById("view-home")?.classList.add("active");
});

/* FEED */
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

/* MODAL open/close (animado vía CSS) */
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

/* Click fuera del modal para cerrar (micro UX HF) */
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeRecipe();
});

/* INGREDIENTES: pocas categorías */
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

/* PASOS */
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

/* SEMANA */
window.addCurrentPlate = function () {
  if (!currentPlate) return;

  if (!week.find(w => w.codigo === currentPlate.codigo)) {
    week.push(currentPlate);
    saveWeek();
    showToast("Agregado a tu semana ✅");
  } else {
    showToast("Ya estaba en tu semana 👍");
  }

  closeRecipe();
};

function renderWeek() {
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
  showToast("Quitado ✅");
};

/* COMPRAS: suma por nombre + unidad */
function renderShopping() {
  shoppingList.innerHTML = "";

  if (!week.length) {
    shoppingList.innerHTML = `<div style="opacity:.6; padding:16px;">Agrega platos para ver tu lista.</div>`;
    return;
  }

  const grouped = {}; // cat -> key -> {name, unit, qty}

  week.forEach(p => {
    ingredientes
      .filter(i => i.codigo_plato === p.codigo)
      .forEach(i => {
        const cat = normalizeCategory(i.tipo_ingrediente);
        const name = (i.ingrediente || "").trim();
        const unit = (i.unidad_medida || "").trim();
        const key = unit ? `${name}__${unit}` : name;

        const qty = (i.cantidad && String(i.cantidad).trim() !== "") ? Number(i.cantidad) : 1;
        const safeQty = isNaN(qty) ? 1 : qty;

        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][key]) grouped[cat][key] = { name, unit, qty: 0 };

        grouped[cat][key].qty += safeQty;
      });
  });

  Object.entries(grouped).forEach(([cat, items]) => {
    const block = document.createElement("div");
    block.className = "shopping-category";

    const title = document.createElement("div");
    title.className = "shopping-category-title";
    title.textContent = cat;
    block.appendChild(title);

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

/* STORAGE + counter bump */
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
  weekCounter.classList.remove("bump");
  // forzar reflow para re-disparar anim
  void weekCounter.offsetWidth;
  weekCounter.classList.add("bump");
}
