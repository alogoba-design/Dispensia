/* ======================= DATA SOURCES (Google Sheets) ======================= */
const URL_PLATOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const URL_ING =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const URL_PASOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_PATH = "assets/img/";

/* ============================ CSV PARSER SIMPLE ============================ */
async function csv(url) {
  const t = await (await fetch(url)).text();
  const rows = t.split("\n").map((r) => r.split(","));
  const head = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length && r[0].trim() !== "")
    .map((r) => {
      const o = {};
      r.forEach((v, i) => (o[head[i]] = (v ?? "").trim()));
      return o;
    });
}

/* ============================ GLOBAL STATE ============================ */
let PLATOS = [];
let ING = [];
let PASOS = [];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
let SEMANA = {}; // { "Lunes": codigo_plato, ... }
let currentFilter = "all";
let currentRecipeId = null; // para asignar desde modal

/* ============================ INIT ============================ */
(async function init() {
  PLATOS = await csv(URL_PLATOS);
  ING = await csv(URL_ING);
  PASOS = await csv(URL_PASOS);
  DIAS.forEach((d) => (SEMANA[d] = null));
  renderMeals();
  renderInlinePlanner();
  renderWeekBoard();
  updateWeekCount();
})();

/* ============================ HELPERS ============================ */
function scrollToCatalog() {
  document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
}

function getMealImage(p) {
  const file = p.imagen_archivo || `${p.codigo}.jpg`;
  return IMG_PATH + file;
}

function getTagsForMeal(p) {
  const tags = [];

  const time = Number(p["tiempo_preparacion(min)"] || 0);
  const portions = Number(p.porciones || 0);

  if (time && time <= 25) tags.push("Rápido");
  if (portions >= 5) tags.push("Para compartir");
  // Puedes mapear dificultad si quieres
  if ((p.dificultad || "").toLowerCase().includes("fácil")) tags.push("Fácil");

  return tags;
}

/* ============================ RENDER CATALOG ============================ */
function renderMeals() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  let filtered = PLATOS.slice();
  if (currentFilter === "rapido") {
    filtered = filtered.filter((p) => Number(p["tiempo_preparacion(min)"] || 0) <= 25);
  }
  // otros filtros pueden basarse en reglas, de momento placeholder
  // econ/prote/nopica requieren más columnas, así que los dejamos igual por ahora

  filtered.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = p.codigo;

    card.addEventListener("dragstart", onCardDragStart);

    const tags = getTagsForMeal(p);

    card.innerHTML = `
      <img src="${getMealImage(p)}" class="card-img" alt="${p.nombre_plato}" />
      <div class="card-body">
        <div class="card-title">${p.nombre_plato}</div>
        <div class="card-meta">
          ⏱ ${p["tiempo_preparacion(min)"]} min · 🍽 ${p.porciones} porciones
        </div>
        <div class="card-tags">
          ${tags.map((t) => `<span class="tag tag-primary">${t}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="card-btn" onclick="openRecipe('${p.codigo}')">Ver receta</button>
          <button class="card-btn primary" onclick="openAssignFromCard('${p.codigo}')">
            Agregar a un día
          </button>
        </div>
      </div>
    `;
    gallery.appendChild(card);
  });
}

/* ============================ FILTERS ============================ */
function filterMeals(type, chipEl) {
  currentFilter = type;
  // actualizar chips activos
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  if (chipEl) chipEl.classList.add("active");
  renderMeals();
}

/* ============================ MODAL RECETA ============================ */
function openRecipe(codigo) {
  currentRecipeId = codigo;
  const r = PLATOS.find((p) => p.codigo === codigo);
  if (!r) return;

  const modalImg = document.getElementById("modalImg");
  const modalName = document.getElementById("modalName");
  const modalTime = document.getElementById("modalTime");
  const modalPortions = document.getElementById("modalPortions");
  const modalDiff = document.getElementById("modalDifficulty");
  const modalIng = document.getElementById("modalIngredients");
  const modalSteps = document.getElementById("modalSteps");
  const videoContainer = document.getElementById("modalVideoContainer");
  const assignBtns = document.getElementById("assignBtns");

  modalImg.src = getMealImage(r);
  modalName.textContent = r.nombre_plato;
  modalTime.textContent = `${r["tiempo_preparacion(min)"]} min`;
  modalPortions.textContent = `${r.porciones} porciones`;
  modalDiff.textContent = r.dificultad || "Sin dificultad";

  modalIng.innerHTML = ING.filter((i) => i.codigo_plato === codigo)
    .map((i) => `<li>${i.ingrediente} — ${i.cantidad || ""} ${i.unidad_medida || ""}</li>`)
    .join("");

  modalSteps.innerHTML = PASOS.filter((s) => s.codigo === codigo)
    .sort((a, b) => Number(a.orden) - Number(b.orden))
    .map((s) => `<li>${s.indicacion}</li>`)
    .join("");

  // Video con autoplay (muted) para evitar bloqueos
  if (r.youtube_id) {
    const src = `https://www.youtube.com/embed/${r.youtube_id}?autoplay=1&mute=1`;
    videoContainer.innerHTML = `
      <iframe src="${src}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    `;
  } else {
    videoContainer.innerHTML = `<div style="color:#6b7280;font-size:13px;">Este plato aún no tiene video asociado.</div>`;
  }

  // botones de asignación rápida
  assignBtns.innerHTML = DIAS.map(
    (d) => `<button onclick="assignToDay('${d}','${codigo}')">${d}</button>`
  ).join("");

  document.getElementById("recipeModal").style.display = "flex";
}

function closeRecipe() {
  document.getElementById("recipeModal").style.display = "none";
  // limpiar iframe para detener el video
  document.getElementById("modalVideoContainer").innerHTML = "";
}

/* ============================ ASIGNAR PLATO ============================ */
function assignToDay(dia, codigo) {
  SEMANA[dia] = codigo;
  renderInlinePlanner();
  renderWeekBoard();
  updateWeekCount();
}

function openAssignFromCard(codigo) {
  openRecipe(codigo);
}

/* ============================ INLINE PLANNER ============================ */
function renderInlinePlanner() {
  const c = document.getElementById("inlinePlanner");
  c.innerHTML = "";
  DIAS.forEach((d) => {
    const id = SEMANA[d];
    const meal = id ? PLATOS.find((p) => p.codigo === id) : null;
    const div = document.createElement("div");
    div.className = "inline-day";
    div.dataset.day = d;

    div.addEventListener("dragover", onDayDragOver);
    div.addEventListener("drop", onDayDrop);

    div.innerHTML = `
      <div class="inline-day-title">${d}</div>
      ${
        meal
          ? `<div class="inline-day-meal">• ${meal.nombre_plato}</div>`
          : `<div style="font-size:11px;color:#9ca3af;">Arrastra un plato aquí</div>`
      }
    `;
    c.appendChild(div);
  });
}

/* ============================ PLANNER MODAL ============================ */
function renderWeekBoard() {
  const c = document.getElementById("weekBoard");
  if (!c) return;
  c.innerHTML = "";
  DIAS.forEach((d) => {
    const id = SEMANA[d];
    const meal = id ? PLATOS.find((p) => p.codigo === id) : null;
    const dayBox = document.createElement("div");
    dayBox.className = "day-box";
    dayBox.dataset.day = d;

    dayBox.addEventListener("dragover", onDayDragOver);
    dayBox.addEventListener("drop", onDayDrop);

    dayBox.innerHTML = `
      <h4>${d}</h4>
      ${
        meal
          ? `
        <img src="${getMealImage(meal)}" alt="${meal.nombre_plato}">
        <div style="font-size:12px;margin-bottom:4px;">${meal.nombre_plato}</div>
        <button onclick="removeDay('${d}')">Quitar</button>
      `
          : `<p style="font-size:12px;color:#9ca3af;">Arrastra un plato o selecciónalo desde el catálogo.</p>`
      }
    `;
    c.appendChild(dayBox);
  });
}

function removeDay(dia) {
  SEMANA[dia] = null;
  renderInlinePlanner();
  renderWeekBoard();
  updateWeekCount();
}

function clearWeek() {
  DIAS.forEach((d) => (SEMANA[d] = null));
  renderInlinePlanner();
  renderWeekBoard();
  updateWeekCount();
}

/* ============================ DRAG & DROP ============================ */

function onCardDragStart(ev) {
  const id = ev.currentTarget.dataset.id;
  ev.dataTransfer.setData("text/plain", id);
}

function onDayDragOver(ev) {
  ev.preventDefault();
}

function onDayDrop(ev) {
  ev.preventDefault();
  const id = ev.dataTransfer.getData("text/plain");
  const day = ev.currentTarget.dataset.day;
  if (!day || !id) return;
  assignToDay(day, id);
}

/* ============================ SHOPPING LIST ============================ */
function openShopping() {
  const container = document.getElementById("shoppingList");
  const bag = {}; // key: "ingrediente|unidad|tipo"

  Object.values(SEMANA)
    .filter(Boolean)
    .forEach((codigo) => {
      ING.filter((i) => i.codigo_plato === codigo).forEach((i) => {
        const key = `${i.ingrediente}|${i.unidad_medida || ""}|${i.tipo_ingrediente || "Otros"}`;
        bag[key] = (bag[key] || 0) + (parseFloat(i.cantidad) || 0);
      });
    });

  // agrupar por tipo_ingrediente
  const porCategoria = {};
  Object.entries(bag).forEach(([key, qty]) => {
    const [nombre, unidad, tipo] = key.split("|");
    if (!porCategoria[tipo]) porCategoria[tipo] = [];
    porCategoria[tipo].push({ nombre, unidad, qty });
  });

  container.innerHTML = "";
  Object.entries(porCategoria).forEach(([tipo, items]) => {
    const box = document.createElement("div");
    box.className = "shopping-category";
    box.innerHTML = `<div class="shopping-category-title">${tipo}</div>`;
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "shopping-item";
      row.innerHTML = `
        <span>${it.nombre}</span>
        <span>${it.qty || ""} ${it.unidad || ""}</span>
      `;
      box.appendChild(row);
    });
    container.appendChild(box);
  });

  document.getElementById("shoppingModal").style.display = "flex";
}

function closeShopping() {
  document.getElementById("shoppingModal").style.display = "none";
}

/* ============================ WEEK COUNT BADGE ============================ */
function updateWeekCount() {
  const count = Object.values(SEMANA).filter(Boolean).length;
  const badge = document.getElementById("weekCountBadge");
  if (badge) {
    badge.textContent = `${count} plato${count === 1 ? "" : "s"} en tu semana`;
  }
}

/* ============================ MODAL PLANNER ============================ */
function openPlanner() {
  renderWeekBoard();
  document.getElementById("plannerModal").style.display = "flex";
}

function closePlanner() {
  document.getElementById("plannerModal").style.display = "none";
}

/* ============================ CLOSE MODALS ON BACKDROP CLICK ============================ */
document.addEventListener("click", (ev) => {
  if (ev.target.id === "recipeModal") closeRecipe();
  if (ev.target.id === "plannerModal") closePlanner();
  if (ev.target.id === "shoppingModal") closeShopping();
});
