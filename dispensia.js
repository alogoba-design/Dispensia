/*****************************************************
 * DISPENSIA – versión estable FINAL
 * ✔ Usa cantidad_reg / unidad_reg
 * ✔ Receta: agrupada por parte_del_plato + obs
 * ✔ Compras: agrupadas por tipo_ingrediente
 * ✔ PDF + WhatsApp
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

  chips.innerHTML = `
    <span class="chip active" data-filter="all">Todas</span>
    <span class="chip" data-filter="rapido">Rápidas</span>
  `;

  Array.from(set).sort().forEach(t => {
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

/* ================= RECETA – INGREDIENTES ================= */
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
      const qty =
        i.cantidad_reg && String(i.cantidad_reg).trim() !== ""
          ? i.cantidad_reg
          : 1;

      const unit = i.unidad_reg ? ` ${i.unidad_reg}` : "";
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
    week.push({
      codigo: currentPlate.codigo,
      nombre_plato: currentPlate.nombre_plato
    });
    saveWeek();
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
    li.textContent = p.nombre_plato;
    weekList.appendChild(li);
  });
}

/* ================= COMPRAS ================= */
function renderShopping() {
  if (!shoppingList) return;
  shoppingList.innerHTML = "";

  if (!week.length) return;

  const grouped = {};

  week.forEach(wp => {
    ingredientes
      .filter(i => i.codigo_plato === wp.codigo)
      .forEach(i => {
        const cat = (i.tipo_ingrediente || "Otros").trim();
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

/* ================= PDF ================= */
function exportShoppingPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 14;
  doc.setFontSize(16);
  doc.text("Lista de compras – DISPENSIA", 14, y);
  y += 8;

  document.querySelectorAll(".shopping-category").forEach(block => {
    const title = block.querySelector(".shopping-category-title").innerText;
    doc.setFontSize(13);
    doc.text(title, 14, y);
    y += 6;

    block.querySelectorAll(".shopping-item").forEach(item => {
      const spans = item.querySelectorAll("span");
      doc.setFontSize(11);
      doc.text(`- ${spans[0].innerText}: ${spans[1].innerText}`, 16, y);
      y += 5;
    });

    y += 4;
    if (y > 270) {
      doc.addPage();
      y = 14;
    }
  });

  doc.save("Lista_de_compras_DISPENSIA.pdf");
}

/* ================= WHATSAPP ================= */
function shareShoppingWhatsApp() {
  let text = "🛒 *Lista de compras – DISPENSIA*\n\n";

  document.querySelectorAll(".shopping-category").forEach(block => {
    const title = block.querySelector(".shopping-category-title").innerText;
    text += `*${title}*\n`;

    block.querySelectorAll(".shopping-item").forEach(item => {
      const spans = item.querySelectorAll("span");
      text += `- ${spans[0].innerText}: ${spans[1].innerText}\n`;
    });

    text += "\n";
  });

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
modal.addEventListener("click", e => {
  if (e.target === modal) closeRecipe();
});

