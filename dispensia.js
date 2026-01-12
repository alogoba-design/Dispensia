const PLATOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const ING_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const STORAGE = "dispensia_week";

let platos = [];
let ingredientes = [];
let week = JSON.parse(localStorage.getItem(STORAGE)) || [];
let currentPlate = null;

/* INIT */
document.addEventListener("DOMContentLoaded", async () => {
  platos = await loadCSV(PLATOS_URL);
  ingredientes = await loadCSV(ING_URL);
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();

  document.getElementById("addToWeekBtn")
    .addEventListener("click", addCurrentPlate);

  document.getElementById("closeModal")
    .addEventListener("click", closeRecipe);
});

/* CSV */
function loadCSV(url){
  return new Promise(res=>{
    Papa.parse(url,{
      download:true,
      header:true,
      complete:r=>res(r.data.filter(x=>x.codigo))
    });
  });
}

/* FEED */
function renderFeed(){
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  platos.forEach(p=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="assets/img/${p.imagen_archivo}">
      <h3>${p.nombre_plato}</h3>
      <button>Ver plato</button>
    `;
    div.querySelector("button").onclick = ()=>openRecipe(p.codigo);
    feed.appendChild(div);
  });
}

/* MODAL */
function openRecipe(codigo){
  currentPlate = platos.find(p=>p.codigo===codigo);
  if(!currentPlate) return;

  document.getElementById("modalName").textContent = currentPlate.nombre_plato;
  document.getElementById("videoFrame").src =
    "https://www.youtube.com/embed/" + currentPlate.youtube_id;

  document.getElementById("recipeModal").setAttribute("aria-hidden","false");
}

function closeRecipe(){
  document.getElementById("recipeModal").setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
}

/* ADD WEEK — FIX DEFINITIVO */
function addCurrentPlate(){
  if(!currentPlate) return;

  if(!week.find(w=>w.codigo===currentPlate.codigo)){
    week.push({ codigo: currentPlate.codigo, nombre: currentPlate.nombre_plato });
    localStorage.setItem(STORAGE, JSON.stringify(week));
  }

  renderWeek();
  renderShopping();
  updateCounter();
  closeRecipe();
  switchView("home");
}

/* WEEK */
function renderWeek(){
  const el = document.getElementById("weekList");
  el.innerHTML = "";
  week.forEach((p,i)=>{
    el.innerHTML += `<div>${p.nombre}</div>`;
  });
}

/* SHOPPING — ORDEN: CATEGORIA → CANTIDAD */
function renderShopping(){
  const tbody = document.getElementById("shoppingList");
  tbody.innerHTML = "";

  const rows = {};

  week.forEach(w=>{
    ingredientes
      .filter(i=>i.codigo_plato===w.codigo)
      .forEach(i=>{
        const key = `${i.tipo_ingrediente}|${i.ingrediente}|${i.unidad_reg}`;
        if(!rows[key]){
          rows[key] = {
            categoria: i.tipo_ingrediente,
            ingrediente: i.ingrediente,
            unidad: i.unidad_reg,
            qty: 0
          };
        }
        rows[key].qty += Number(i.cantidad_reg)||0;
      });
  });

  Object.values(rows)
    .sort((a,b)=>{
      if(a.categoria !== b.categoria){
        return a.categoria.localeCompare(b.categoria);
      }
      return b.qty - a.qty;
    })
    .forEach(r=>{
      tbody.innerHTML += `
        <tr>
          <td>${r.categoria}</td>
          <td>${r.ingrediente}</td>
          <td>${r.unidad}</td>
          <td>${r.qty.toFixed(2)}</td>
        </tr>`;
    });
}

/* NAV */
function switchView(v){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  document.getElementById("view-"+v).classList.add("active");
}

/* COUNTER */
function updateCounter(){
  document.getElementById("weekCounter").textContent =
    `${week.length} platos en tu semana`;
}
