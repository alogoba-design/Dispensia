const FEED = document.getElementById("feed");
const SHEET = document.getElementById("recipeSheet");

/* MOCK DATA (para validar UX) */
const meals = [
  {
    name: "Causa de Pollo",
    meta: "⏱ 30 min · 🍽 4 porciones",
    img: "https://images.unsplash.com/photo-1604908554269-8d4c45b6f8c7",
    video: "https://www.youtube.com/embed/8QG8f5vK2kg",
    ingredients: ["Papa amarilla", "Pollo", "Mayonesa", "Ají amarillo"],
    steps: ["Hervir papas", "Deshilachar pollo", "Armar la causa"]
  },
  {
    name: "Ají de Gallina",
    meta: "⏱ 35 min · 🍽 4 porciones",
    img: "https://images.unsplash.com/photo-1625944226823-90b3f6b4c6f5",
    video: "https://www.youtube.com/embed/4v0kYxX7K9w",
    ingredients: ["Pollo", "Pan", "Leche", "Ají amarillo"],
    steps: ["Cocer pollo", "Licuar ají", "Mezclar todo"]
  }
];

function renderFeed() {
  FEED.innerHTML = "";
  meals.forEach(m => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${m.img}">
      <div class="card-body">
        <h3>${m.name}</h3>
        <p>${m.meta}</p>
        <div class="card-actions">
          <button class="primary" onclick="openRecipe('${m.name}')">Elegir plato</button>
          <button class="secondary" onclick="openRecipe('${m.name}')">Ver receta</button>
        </div>
      </div>`;
    FEED.appendChild(card);
  });
}

function openRecipe(name) {
  const m = meals.find(x => x.name === name);
  document.getElementById("recipeName").textContent = m.name;
  document.getElementById("recipeMeta").textContent = m.meta;
  document.getElementById("recipeVideo").src = m.video;
  document.getElementById("recipeIngredients").innerHTML =
    m.ingredients.map(i => `<li>${i}</li>`).join("");
  document.getElementById("recipeSteps").innerHTML =
    m.steps.map(s => `<li>${s}</li>`).join("");
  SHEET.style.display = "flex";
}

function closeRecipe() {
  document.getElementById("recipeVideo").src = "";
  SHEET.style.display = "none";
}

renderFeed();
