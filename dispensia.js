const PLATOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";

const ING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";

const PASOS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_BASE = "assets/img/";
const feed = document.getElementById("feed");
const modal = document.getElementById("recipeModal");
const weekList = document.getElementById("weekList");

let platos=[], ingredientes=[], pasos=[];
let filtro="all";

const days=["L","M","X","J","V","S","D"];
let week={L:null,M:null,X:null,J:null,V:null,S:null,D:null};

function loadCSV(url){
  return new Promise(res=>{
    Papa.parse(url,{
      download:true,
      header:true,
      skipEmptyLines:true,
      complete:r=>res(r.data)
    });
  });
}

async function init(){
  platos = await loadCSV(PLATOS_URL);
  ingredientes = await loadCSV(ING_URL);
  pasos = await loadCSV(PASOS_URL);
  render();
  renderWeek();
}

function render(){
  feed.innerHTML="";
  platos.filter(p=>{
    if(!(p.etapa==="1"||p.etapa==="2")) return false;
    if(filtro==="all") return true;
    if(filtro==="rapido") return Number(p["tiempo_preparacion(min)"])<=25;
    return p.tipo_plato?.toLowerCase().includes(filtro);
  }).forEach(p=>{
    const c=document.createElement("div");
    c.className="card";
    c.innerHTML=`
      <img src="${IMG_BASE+p.imagen_archivo}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>${p["tiempo_preparacion(min)"]} min · ${p.porciones}</p>
        <button onclick="openRecipe('${p.codigo}')">Elegir plato</button>
      </div>`;
    feed.appendChild(c);
  });
}

function openRecipe(cod){
  const p=platos.find(x=>x.codigo===cod);
  document.getElementById("modalName").textContent=p.nombre_plato;
  document.getElementById("modalTime").textContent=p["tiempo_preparacion(min)"]+" min";
  document.getElementById("modalPortions").textContent=p.porciones+" porciones";
  document.getElementById("modalDifficulty").textContent=p.dificultad;
  document.getElementById("videoFrame").src="https://www.youtube.com/embed/"+p.youtube_id;

  document.getElementById("modalIngredients").innerHTML=
    ingredientes.filter(i=>i.codigo_plato===cod)
      .map(i=>`<li>${i.ingrediente}</li>`).join("");

  document.getElementById("modalSteps").innerHTML=
    pasos.filter(s=>s.codigo===cod)
      .sort((a,b)=>a.orden-b.orden)
      .map(s=>`<li>${s.indicacion}</li>`).join("");

  const a=document.getElementById("assignBtns");
  a.innerHTML="";
  days.forEach(d=>{
    const b=document.createElement("button");
    b.textContent=d;
    b.onclick=()=>{week[d]=p; closeRecipe(); renderWeek();};
    a.appendChild(b);
  });

  modal.setAttribute("aria-hidden","false");
}

function closeRecipe(){
  modal.setAttribute("aria-hidden","true");
  document.getElementById("videoFrame").src="";
}

function renderWeek(){
  weekList.innerHTML="";
  days.forEach(d=>{
    const w=document.createElement("div");
    w.className="week-item";
    if(!week[d]){
      w.innerHTML=`<strong>${d}</strong><div>Sin plato</div>`;
    } else {
      w.innerHTML=`
        <strong>${d}</strong>
        <div>${week[d].nombre_plato}</div>
        <img src="${IMG_BASE+week[d].imagen_archivo}">
        <button class="week-remove" onclick="week['${d}']=null;renderWeek()">Quitar</button>`;
    }
    weekList.appendChild(w);
  });
}

document.getElementById("chips").onclick=e=>{
  if(!e.target.dataset.filter) return;
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  e.target.classList.add("active");
  filtro=e.target.dataset.filter;
  render();
};

document.addEventListener("DOMContentLoaded",init);
