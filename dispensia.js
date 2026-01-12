/*****************************************************
/*****************************************************
 * DISPENSIA – versión estable
 * ✔ Receta: cantidad + unidad_medida (NO cambia)
 * ✔ Compras: cantidad_reg + unidad_reg (CAMBIO)
 *****************************************************/

/* ==== CONFIG ==== */
const STORAGE="dispensia_week";
let week=JSON.parse(localStorage.getItem(STORAGE))||[];
let platos=[],ingredientes=[],pasos=[];
let currentPlate=null;
let filtro="all";

document.addEventListener("DOMContentLoaded",async()=>{
  platos=await loadCSV(PLATOS_URL);
  ingredientes=await loadCSV(ING_URL);
  pasos=await loadCSV(PASOS_URL);
  buildFilters();
  renderFeed();
  renderWeek();
  renderShopping();
  updateCounter();
});

function switchView(v,btn){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  document.getElementById("view-"+v).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
}

function renderShopping(){
  const tb=document.getElementById("shoppingList");
  tb.innerHTML="";
  const map={};

  week.forEach(w=>{
    ingredientes.filter(i=>i.codigo_plato===w.codigo).forEach(i=>{
      const key=i.ingrediente+"_"+i.unidad_reg;
      if(!map[key]) map[key]={...i,qty:0};
      map[key].qty+=Number(i.cantidad_reg)||1;
    });
  });

  Object.values(map).forEach(i=>{
    tb.innerHTML+=`
      <tr>
        <td>${i.ingrediente}</td>
        <td>${i.unidad_reg}</td>
        <td>${i.tipo_ingrediente}</td>
        <td>${i.qty.toFixed(2)}</td>
      </tr>`;
  });
}
