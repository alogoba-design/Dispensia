const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const STORAGE_KEY = "dispensia_week";

let platos = [], ingredientes = [], pasos = [];
let filtro = "all";
let week = loadWeek();

// ✅ “plato actual” para que los botones del modal SIEMPRE funcionen
let currentPlate = null;

const feed = document.getElementById("feed");
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");
const weekCounter = document.getElementById("weekCounter");
const modal = document.getElementById("recipeModal");

// modal elements
const closeBtn = document.getElementById("closeBtn");
const backBtn = document.getElementById("backBtn");
const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");

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
  renderShopping();
}

function loadCSV(url) {
  return new Promise(res => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: r => res(r.data)
    });
  });
}

async function init() {
  platos = await loadCSV(PLATOS_URL);
  ingredientes = await loadCSV(ING_URL);
  pasos = await loadCSV(PASOS_URL);

  wireModalButtons();     // ✅ listeners 1 sola vez
  render();
  renderWeek();
  renderShopping();
  updateCounter();
}

function wireModalButtons() {
  // cerrar modal
  closeBtn.addEventListener("click", closeRecipe);
  backBtn.addEventListener("click", closeRecipe);

  // agregar
  addBtn.addEventListener("click", () => {
    if (!currentPlate) return;
    if (!week.find(w => w.codigo === currentPlate.codigo)) {
      week.push(currentPlate);
      saveWeek();
      renderWeek();
    }
    closeRecipe(); // ✅ siempre cierra
  });

  // quitar
  removeBtn.addEventListener("click", () => {
    if (!currentPlate) return;
    week = week.filter(w => w.codigo !== currentPlate.codigo);
    saveWeek();
    renderWeek();
    closeRecipe(); // ✅ siempre cierra
  });

  // cerrar al hacer click fuera de la caja (opcional, UX)
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeRecipe();
  });
}

function render() {
  feed.innerHTML = "";
  platos
    .filter(p => {
      if (!(p.etapa === "1" || p.etapa === "2")) return false;
      if (filtro === "all") return true;
      if (filtro === "rapido") return Number(p["tiempo_preparacion(min)"]) <= 25;
      return p.tipo_plato?.toLowerCase().includes(filtro);
    })
    .forEach(p => {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `
        <img src="${IMG_BASE + p.imagen_archivo}">
        <div class="card-body">
          <h3>${p.nombre_plato}</h3>
          <p>${p["tiempo_preparacion(min)"]} min · ${p.porciones}</p>
          <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
        </div>`;
      feed.appendChild(c);
    });
}

// 👇 queda global para el onclick del HTML
window.openRecipe = function openRecipe(cod) {
  const p = platos.find(x => x.codigo === cod);
  if (!p) return;

  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = (p["tiempo_preparacion(min)"] || "") + " min";
  document.getElementById("modalPortions").textContent = (p.porciones || "") + " porciones";
  document.getElementById("modalDifficulty").textContent = p.dificultad || "";

  const yt = (p.youtube_id || "").trim();
  document.getElementById("videoFrame").src = yt ? ("https://www.youtube.com/embed/" + yt) : "";

  document.getElementById("modalIngredients").innerHTML =
    ingredientes
      .filter(i => i.codigo_plato === cod)
      .map(i => `<li>${i.ingrediente}</li>`)
      .join("");

  document.getElementById("modalSteps").innerHTML =
    pasos
      .filter(s => s.codigo === cod)
      .sort((a, b) => Number(a.orden) - Number(b.orden))
      .map(s => `<li>${s.indicacion}</li>`)
      .join("");

  // ✅ abrir robusto: aria-hidden + display
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";
};

function closeRecipe() {
  // ✅ cerrar robusto: aria-hidden + display
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
}

function renderWeek() {
  weekList.innerHTML = "";
  week.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.nombre_plato}
      <button onclick="remove('${p.codigo}')">Quitar</button>`;
    weekList.appendChild(li);
  });
}

// 👇 global para onclick
window.remove = function remove(cod) {
  week = week.filter(w => w.codigo !== cod);
  saveWeek();
  renderWeek();
};

function renderShopping() {
  shoppingList.innerHTML = "";
  const map = {};

  week.forEach(p => {
    ingredientes
      .filter(i => i.codigo_plato === p.codigo)
      .forEach(i => {
        const name = (i.ingrediente || "").trim();
        if (!name) return;
        if (!map[name]) map[name] = 0;
        map[name] += Number(i.cantidad) || 1;
      });
  });

  Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([name, qty]) => {
      const li = document.createElement("li");
      li.textContent = `${name} — ${qty}`;
      shoppingList.appendChild(li);
    });
}

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

document.getElementById("chips").onclick = e => {
  if (!e.target.dataset.filter) return;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  e.target.classList.add("active");
  filtro = e.target.dataset.filter;
  render();
};

document.addEventListener("DOMContentLoaded", init);
