let pet = {
  name: "",
  type: "",
  mood: "Happy",
  energy: 100,
  health: 100,
  coins: 100,
  expenses: 0
};

function startGame() {
  pet.name = document.getElementById("petNameInput").value || "Fluffy";
  pet.type = document.getElementById("petType").value;

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";
  document.getElementById("petName").textContent = pet.name;
  document.getElementById("petTypeDisplay").textContent = pet.type;

  updateStats();
}

function updateStats() {
  document.getElementById("mood").textContent = pet.mood;
  document.getElementById("energy").textContent = pet.energy;
  document.getElementById("health").textContent = pet.health;
  document.getElementById("coins").textContent = pet.coins;
  document.getElementById("expenses").textContent = pet.expenses;
}

function feedPet() {
  if (pet.coins >= 5) {
    pet.energy += 10;
    pet.expenses += 5;
    pet.coins -= 5;
    pet.mood = "Content";
  } else {
    pet.mood = "Hungry 😢";
  }
  updateStats();
}

function playWithPet() {
  if (pet.coins >= 10) {
    pet.energy -= 15;
    pet.health += 5;
    pet.expenses += 10;
    pet.coins -= 10;
    pet.mood = "Excited!";
  } else {
    pet.mood = "Bored 😞";
  }
  updateStats();
}

function restPet() {
  pet.energy += 20;
  pet.mood = "Rested 😴";
  updateStats();
}

function cleanPet() {
  if (pet.coins >= 3) {
    pet.health += 5;
    pet.expenses += 3;
    pet.coins -= 3;
    pet.mood = "Fresh ✨";
  } else {
    pet.mood = "Dirty 😷";
  }
  updateStats();
}

function vetVisit() {
  if (pet.coins >= 20) {
    pet.health = 100;
    pet.expenses += 20;
    pet.coins -= 20;
    pet.mood = "Healthy 🩺";
  } else {
    pet.mood = "Sick 🤒";
  }
  updateStats();
}

function doChore() {
  pet.coins += 10;
  pet.mood = "Helpful 💪";
  updateStats();
}
