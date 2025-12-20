/***********************
 * 1) CONFIGURACIÓN
 ***********************/
const IMG_BASE = "assets/img/";

/**
 * Pega aquí la URL PUBLICADA del sheet (no la de /edit).
 * Debe verse así (ejemplo):
 * https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv
 */
const SHEET_PLATOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";


/***********************
 * 2) ESTADO
 ***********************/
const feedEl = document.getElementById("feed");
const modalEl = document.getElementById("recipeModal");

let platos = [];
let filtro = "all";
let activeCodigo = null;

/***********************
 * 3) UTILIDADES
 ***********************/
function parseTags(tipo_plato) {
  // tipo_plato viene como "criollo,pollo,crema"
  if (!tipo_plato) return [];
  return tipo_plato
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function ytEmbed(youtube_id) {
  if (!youtube_id) return "";
  return `https://www.youtube.com/embed/${youtube_id}`;
}

function safeText(v) {
  return (v ?? "").toString().trim();
}

function isEtapa12(etapa) {
  const e = safeText(etapa);
  return e === "1" || e === "2";
}

function isRapido(row) {
  // Si tienes clasificacion_tiempo = "Rápidos" úsalo,
  // o si quieres regla: tiempo <= 25:
  const clas = safeText(row.clasificacion_tiempo).toLowerCase();
  const t = Number(safeText(row["tiempo_preparacion(min)"]).replace(",", "."));
  return clas.includes("ráp") || clas.includes("rap") || (Number.isFinite(t) && t <= 25);
}

/***********************
 * 4) CARGA DE DATOS (PAPAPARSE)
 ***********************/
function loadPlatos() {
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_PLATOS_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
}

/***********************
 * 5) RENDER FEED
 ***********************/
function applyFilters(rows) {
  let out = rows.filter(r => isEtapa12(r.etapa));

  if (filtro === "all") return out;

  if (filtro === "rapido") {
    return out.filter(isRapido);
  }

  // filtro por tag dentro de tipo_plato
  return out.filter(r => parseTags(r.tipo_plato).includes(filtro));
}

function render() {
  const show = applyFilters(platos);

  feedEl.innerHTML = "";

  if (!show.length) {
    feedEl.innerHTML = `
      <div style="padding:14px;color:#6b7280;">
        No hay platos para este filtro (o tu URL CSV no está bien publicada).
      </div>
    `;
    return;
  }

  show.forEach(r => {
    const codigo = safeText(r.codigo);
    const nombre = safeText(r.nombre_plato);
    const mins = safeText(r["tiempo_preparacion(min)"]);
    const porciones = safeText(r.porciones);
    const imgFile = safeText(r.imagen_archivo);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${IMG_BASE + imgFile}" alt="${nombre}" loading="lazy" />
      <div class="card-body">
        <h3>${nombre}</h3>
        <p>⏱ ${mins} min · 🍽 ${porciones}</p>
        <div class="card-actions">
          <button class="primary" data-open="${codigo}">Elegir plato</button>
          <button class="secondary" data-open="${codigo}">Ver receta</button>
        </div>
      </div>
    `;

    card.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => openRecipe(codigo));
    });

    feedEl.appendChild(card);
  });
}

/***********************
 * 6) MODAL
 ***********************/
function openRecipe(codigo) {
  const r = platos.find(x => safeText(x.codigo) === safeText(codigo));
  if (!r) return;

  activeCodigo = codigo;

  document.getElementById("modalName").textContent = safeText(r.nombre_plato);
  document.getElementById("modalTime").textContent = `⏱ ${safeText(r["tiempo_preparacion(min)"])} min`;
  document.getElementById("modalPortions").textContent = `🍽 ${safeText(r.porciones)}`;
  document.getElementById("modalDifficulty").textContent = safeText(r.dificultad);

  // Video
  const src = ytEmbed(safeText(r.youtube_id));
  document.getElementById("videoFrame").src = src;

  // Por ahora, placeholders (cuando conectemos ingredientes/pasos de tus otras hojas)
  document.getElementById("modalIngredients").innerHTML =
    `<li>(Conectaremos tu hoja de Ingredientes en la siguiente fase)</li>`;
  document.getElementById("modalSteps").innerHTML =
    `<li>(Conectaremos tu hoja de Indicaciones en la siguiente fase)</li>`;

  modalEl.setAttribute("aria-hidden", "false");
}

function closeRecipe() {
  document.getElementById("videoFrame").src = "";
  modalEl.setAttribute("aria-hidden", "true");
}

document.getElementById("closeBtn").addEventListener("click", closeRecipe);

// cerrar tocando el fondo oscuro
modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) closeRecipe();
});

/***********************
 * 7) CHIPS (FILTROS)
 ***********************/
document.getElementById("chips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;

  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");

  filtro = btn.dataset.filter;
  render();
});

/***********************
 * 8) INIT
 ***********************/
(async function init(){
  try {
    if (!SHEET_PLATOS_URL.startsWith("http")) {
      feedEl.innerHTML = `<div style="padding:14px;color:#6b7280;">
        Falta configurar <b>SHEET_PLATOS_URL</b> en dispensia.js (URL publicada CSV).
      </div>`;
      return;
    }

    platos = await loadPlatos();
    render();
  } catch (err) {
    console.error(err);
    feedEl.innerHTML = `<div style="padding:14px;color:#6b7280;">
      Error cargando Sheet. Revisa consola y que el CSV esté publicado.
    </div>`;
  }
})();
