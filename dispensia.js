const STORAGE_KEY = "dispensia_week";
const IMG_BASE = "assets/img/";

let platos = [];
let ingredientes = [];
let pasos = [];
let week = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentPlate = null;

const feed = document.getElementById("feed");
const weekList = document.getElementById("weekList");
const shoppingList = document.getElementById("shoppingList");
const weekCounter = document.getElementById("weekCounter");
const modal = document.getElementById("recipeModal");

function saveWeek() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(week));
  updateCounter();
  renderWeek();
  renderShopping();
}

/* ---------- MODAL ---------- */
window.openRecipe = function (codigo) {
  const p = platos.find(x => x.codigo === codigo);
  if (!p) return;

  currentPlate = p;

  document.getElementById("modalName").textContent = p.nombre_plato;
  document.getElementById("modalTime").textContent = `${p["tiempo_preparacion(min)"]} min`;
  document.getElementById("modalPortions").textContent = `${p.porciones} porciones`;
  document.getElementById("modalDifficulty").textContent = p.dificultad;
  document.getElementById("videoFrame").src = `https://www.youtube.com/embed/${p.youtube_id}`;

  document.getElementById("modalIngredients").innerHTML =
    ingredientes.filter(i => i.codigo_plato === codigo)
      .map(i => `<li>${i.ingrediente}</li>`).join("");

  document.getElementById("modalSteps").innerHTML =
    pasos.filter(s => s.codigo === codigo)
      .sort((a,b)=>a.orden-b.orden)
      .map(s => `<li>${s.indicacion}</li>`).join("");

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
};

window.closeRecipe = function () {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("videoFrame").src = "";
};

window.addCurrentPlate = function () {
  if (!currentPlate) return;
  if (!week.find(w => w.codigo === currentPlate.codigo)) {
    week.push(currentPlate);
    saveWeek();
  }
  closeRecipe();
};

window.removeCurrentPlate = function () {
  if (!currentPlate) return;
  week = week.filter(w => w.codigo !== currentPlate.codigo);
  saveWeek();
  closeRecipe();
};

/* ---------- SEMANA ---------- */
function renderWeek() {
  weekList.innerHTML = "";
  week.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.nombre_plato}
      <button onclick="removeFromWeek('${p.codigo}')">Quitar</button>`;
    weekList.appendChild(li);
  });
}

window.removeFromWeek = function (codigo) {
  week = week.filter(w => w.codigo !== codigo);
  saveWeek();
};

function updateCounter() {
  weekCounter.textContent = `${week.length} platos en tu semana`;
}

/* ---------- COMPRAS ---------- */
function renderShopping() {
  shoppingList.innerHTML = "";
  const map = {};

  week.forEach(p => {
    ingredientes.filter(i => i.codigo_plato === p.codigo).forEach(i => {
      map[i.ingrediente] = (map[i.ingrediente] || 0) + (Number(i.cantidad) || 1);
    });
  });

  Object.entries(map).forEach(([name, qty]) => {
    const li = document.createElement("li");
    li.textContent = `${name} — ${qty}`;
    shoppingList.appendChild(li);
  });
}

/* ---------- INIT (usa tus CSV actuales) ---------- */
async function init() {
  platos = await fetchCSV(PLATOS_URL);
  ingredientes = await fetchCSV(ING_URL);
  pasos = await fetchCSV(PASOS_URL);

  render();
  renderWeek();
  renderShopping();
  updateCounter();
}

document.addEventListener("DOMContentLoaded", init);
