
/*****************************************************
 * DISPENSIA – versión estable
 * FIX DEFINITIVO: Agregar a mi semana (desktop + mobile)
 *****************************************************/

const SHEET_PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const SHEET_ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const SHEET_PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const STORAGE = "dispensia_week";

let platos = [];
let ingredientes = [];
let pasos = [];
let week = JSON.parse(localStorage.getItem(STORAGE) || "[]");
let currentPlate = null;

/* ================== CSV ================== */
async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

/* ================== INIT ================== */
async function init() {
  platos = await fetchCSV(SHEET_PLATOS_URL);
  ingredientes = await fetchCSV(SHEET_ING_URL);
  pasos = await fetchCSV(SHEET_PASOS_URL);

  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();
}

init();

/* ================== FEED ================== */
function renderFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  platos.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="assets/img/${p.imagen_archivo}" alt="${p.nombre_plato}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>⏱ ${p["tiempo_preparacion(min)"]} min · 🍽 ${p.porciones}</p>
        <button class="primary" type="button" onclick="openRecipe('${p.codigo}')">
          Ver plato
        </button>
      </div>
    `;
    feed.appendChild(card);
  });
}

/* ================== MODAL ================== */
function openRecipe(codigo) {
  currentPlate = platos.find((p) => p.codigo === codigo);
  if (!currentPlate) return;

  document.getElementById("modalName").textContent =
    currentPlate.nombre_plato;
  document.getElementById("modalTime").textContent =
    `${currentPlate["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent =
    `${currentPlate.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent =
    currentPlate.dificultad || "";

  document.getElementById("videoFrame").src =
    `https://www.youtube.com/embed/${currentPlate.youtube_id}`;

  // Ingredientes (receta)
  const ingList = ingredientes
    .filter((i) => i.codigo_plato === currentPlate.codigo)
    .map(
      (i) =>
        `<li>${i.ingrediente} (${i.cantidad || "-"} ${i.unidad_medida || ""})</li>`
    )
    .join("");
  document.getElementById("modalIngredients").innerHTML = ingList;

  // Pasos
  const pasosList = pasos
    .filter((p) => p.codigo === currentPlate.codigo)
    .sort((a, b) => Number(a.orden) - Number(b.orden))
    .map((p) => `<li>${p.indicacion}</li>`)
    .join("");
  document.getElementById("modalSteps").innerHTML = pasosList;

  document.getElementById("recipeModal").classList.add("active");
}

function closeRecipe() {
  document.getElementById("recipeModal").classList.remove("active");
  document.getElementById("videoFrame").src = "";
  currentPlate = null;
}

/* ================== FIX DEFINITIVO AGREGAR ================== */
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-add-week]");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (!currentPlate) return;

  if (!week.some((w) => w.codigo === currentPlate.codigo)) {
    week.push({
      codigo: currentPlate.codigo,
      nombre: currentPlate.nombre_plato,
    });
    localStorage.setItem(STORAGE, JSON.stringify(week));
  }

  renderWeek();
  renderShopping();
  updateCounter();
  closeRecipe();
});

/* ================== SEMANA ================== */
function renderWeek() {
  const list = document.getElementById("weekList");
  list.innerHTML = "";

  week.forEach((w, idx) => {
    const div = document.createElement("div");
    div.className = "week-item";
    div.innerHTML = `
      <span>${w.nombre}</span>
      <button onclick="removeFromWeek(${idx})">✕</button>
    `;
    list.appendChild(div);
  });
}

function removeFromWeek(i) {
  week.splice(i, 1);
  localStorage.setItem(STORAGE, JSON.stringify(week));
  renderWeek();
  renderShopping();
  updateCounter();
}

/* ================== SHOPPING ================== */
function renderShopping() {
  const tbody = document.getElementById("shoppingList");
  tbody.innerHTML = "";

  const grouped = {};

  week.forEach((w) => {
    ingredientes
      .filter((i) => i.codigo_plato === w.codigo)
      .forEach((i) => {
        const cat = i.tipo_ingrediente || "Otros";
        const key = `${i.ingrediente}|${i.unidad_reg || i.unidad_medida || ""}`;
        const qty = parseFloat(i.cantidad_reg || i.cantidad || 1);

        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][key])
          grouped[cat][key] = {
            ingrediente: i.ingrediente,
            unidad: i.unidad_reg || i.unidad_medida || "",
            cantidad: 0,
          };

        grouped[cat][key].cantidad += isNaN(qty) ? 1 : qty;
      });
  });

  Object.keys(grouped)
    .sort()
    .forEach((cat) => {
      Object.values(grouped[cat])
        .sort((a, b) => b.cantidad - a.cantidad)
        .forEach((i) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${cat}</td>
            <td>${i.ingrediente}</td>
            <td>${i.unidad}</td>
            <td>${i.cantidad.toFixed(2)}</td>
          `;
          tbody.appendChild(tr);
        });
    });
}

/* ================== COUNTER ================== */
function updateCounter() {
  document.getElementById("weekCounter").textContent =
    `${week.length} platos en tu semana`;
}

/* ================== NAV ================== */
function switchView(view, btn) {
  document.querySelectorAll(".view").forEach((v) =>
    v.classList.remove("active")
  );
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.remove("active")
  );

  document.getElementById(`view-${view}`).classList.add("active");
  btn.classList.add("active");
}

