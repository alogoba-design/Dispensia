// ======================= YOUR GOOGLE SHEETS HERE =======================
const URL_PLATOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=0&single=true&output=csv";
const URL_ING = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=688098548&single=true&output=csv";
const URL_PASOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUhilXj9P1Kh1JrpnSJLCT0TM_XBpMM-d3fbw17RREop6Jcz73U_aqmgM-dL5EO8T5Tr_8qG_RgUrx/pub?gid=1382429978&single=true&output=csv";

const IMG_PATH = "assets/img/";

async function csv(u){const t=await(await fetch(u)).text();let r=t.split("\n").map(x=>x.split(","));const h=r.shift();return r.map(x=>Object.fromEntries(x.map((v,i)=>[h[i],v.trim()])))}
let PLATOS=[],ING=[],PASOS=[],SEMANA={};

// ============================= INICIO =============================
async function init(){
 PLATOS=await csv(URL_PLATOS);
 ING=await csv(URL_ING);
 PASOS=await csv(URL_PASOS);
 renderMeals(); renderWeek();
}
init();

// ============================= GALERÍA =============================
function renderMeals(){
 const gal=document.getElementById("gallery"); gal.innerHTML="";
 PLATOS.forEach(p=>{
   gal.innerHTML+=`
    <div class="card">
      <img src="${IMG_PATH+(p.imagen_archivo||p.codigo+'.jpg')}">
      <div class="card-body">
        <h3>${p.nombre_plato}</h3>
        <p>${p["tiempo_preparacion(min)"]} min · ${p.porciones} porciones</p>
        <button onclick="openRecipe('${p.codigo}')">Ver receta</button>
      </div>
    </div>`;
 });
}

// ============================= RECETA =============================
function openRecipe(id){
 const r=PLATOS.find(x=>x.codigo===id);

 modalImg.src=IMG_PATH+(r.imagen_archivo||r.codigo+'.jpg');
 modalName.innerText=r.nombre_plato;
 modalTime.innerText=r["tiempo_preparacion(min)"]+" min";
 modalPortions.innerText=r.porciones+" porciones";

 modalIngredients.innerHTML=ING.filter(i=>i.codigo_plato===id)
    .map(i=>`<li>${i.ingrediente} – ${i.cantidad||""}</li>`).join("");
 modalSteps.innerHTML=PASOS.filter(s=>s.codigo===id)
    .sort((a,b)=>a.orden-b.orden).map(s=>`<li>${s.indicacion}</li>`).join("");

 modalVideoContainer.innerHTML=
   r.youtube_id?`<iframe src="https://www.youtube.com/embed/${r.youtube_id}" allowfullscreen></iframe>`:
   `<p>Sin video disponible</p>`;

 assignBtns.innerHTML=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
  .map(d=>`<button onclick="assign('${d}','${id}')">${d}</button>`).join("");

 recipeModal.style.display="flex";
}
function closeRecipe(){recipeModal.style.display="none"}

// ============================= SEMANA =============================
function assign(day,id){SEMANA[day]=id;closeRecipe();renderWeek()}
function renderWeek(){
 const dias=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
 weekBoard.innerHTML="";
 dias.forEach(d=>{
   const x=SEMANA[d];
   const p=PLATOS.find(z=>z.codigo===x);
   weekBoard.innerHTML+=`
    <div class="day-box">
     <h4>${d}</h4>
     ${p?`<img src="${IMG_PATH+(p.imagen_archivo||p.codigo+'.jpg')}"><button onclick="removeDay('${d}')">Eliminar</button>`:"Vacío"}
    </div>`;
 });
}
function removeDay(d){delete SEMANA[d];renderWeek()}

// ============================= COMPRAS =============================
function openShopping(){
 let bag={};
 Object.values(SEMANA).forEach(id=>{
  ING.filter(i=>i.codigo_plato===id).forEach(i=>{
   bag[i.ingrediente]=(bag[i.ingrediente]||0)+(parseFloat(i.cantidad)||0)
  });
 });

 shoppingList.innerHTML=Object.entries(bag)
   .map(([k,v])=>`<li>${k} — ${v||""}</li>`).join("");

 shoppingModal.style.display="flex";
}
function closeShopping(){shoppingModal.style.display="none"}

// ============================= UI =============================
function openPlanner(){plannerModal.style.display="flex"}
function closePlanner(){plannerModal.style.display="none"}
