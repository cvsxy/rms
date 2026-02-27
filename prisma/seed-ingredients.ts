import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── Create Ingredients ───────────────────────────────────────
  const ingredientData = [
    // Proteins
    { id: "ing-pork-pastor", name: "Pork al Pastor", nameEs: "Cerdo al Pastor", unit: "g", currentStock: 8000, lowStockThreshold: 2000, costPerUnit: 0.18 },
    { id: "ing-sea-bass", name: "Sea Bass Fillet", nameEs: "Filete de Robalo", unit: "g", currentStock: 5000, lowStockThreshold: 1500, costPerUnit: 0.45 },
    { id: "ing-chicken", name: "Chicken Breast", nameEs: "Pechuga de Pollo", unit: "g", currentStock: 6000, lowStockThreshold: 2000, costPerUnit: 0.12 },
    { id: "ing-shrimp", name: "Shrimp", nameEs: "Camarón", unit: "g", currentStock: 3000, lowStockThreshold: 1000, costPerUnit: 0.55 },

    // Produce
    { id: "ing-avocado", name: "Avocado", nameEs: "Aguacate", unit: "units", currentStock: 60, lowStockThreshold: 15, costPerUnit: 25 },
    { id: "ing-lime", name: "Lime", nameEs: "Limón", unit: "units", currentStock: 120, lowStockThreshold: 30, costPerUnit: 3 },
    { id: "ing-onion", name: "White Onion", nameEs: "Cebolla Blanca", unit: "units", currentStock: 40, lowStockThreshold: 10, costPerUnit: 8 },
    { id: "ing-tomato", name: "Tomato", nameEs: "Tomate", unit: "units", currentStock: 50, lowStockThreshold: 15, costPerUnit: 6 },
    { id: "ing-cilantro", name: "Cilantro", nameEs: "Cilantro", unit: "g", currentStock: 2000, lowStockThreshold: 500, costPerUnit: 0.04 },
    { id: "ing-pineapple", name: "Pineapple", nameEs: "Piña", unit: "g", currentStock: 5000, lowStockThreshold: 1000, costPerUnit: 0.03 },
    { id: "ing-jalapeno", name: "Jalapeño", nameEs: "Jalapeño", unit: "units", currentStock: 80, lowStockThreshold: 20, costPerUnit: 2 },
    { id: "ing-tomatillo", name: "Tomatillo", nameEs: "Tomate Verde", unit: "g", currentStock: 3000, lowStockThreshold: 800, costPerUnit: 0.05 },
    { id: "ing-seasonal-veg", name: "Seasonal Vegetables", nameEs: "Verduras de Temporada", unit: "g", currentStock: 4000, lowStockThreshold: 1000, costPerUnit: 0.06 },

    // Dairy
    { id: "ing-cream", name: "Sour Cream", nameEs: "Crema Agria", unit: "ml", currentStock: 5000, lowStockThreshold: 1000, costPerUnit: 0.05 },
    { id: "ing-cheese", name: "Oaxaca Cheese", nameEs: "Queso Oaxaca", unit: "g", currentStock: 3000, lowStockThreshold: 800, costPerUnit: 0.18 },
    { id: "ing-milk", name: "Whole Milk", nameEs: "Leche Entera", unit: "ml", currentStock: 10000, lowStockThreshold: 3000, costPerUnit: 0.02 },
    { id: "ing-condensed-milk", name: "Condensed Milk", nameEs: "Leche Condensada", unit: "ml", currentStock: 4000, lowStockThreshold: 1000, costPerUnit: 0.04 },
    { id: "ing-evap-milk", name: "Evaporated Milk", nameEs: "Leche Evaporada", unit: "ml", currentStock: 4000, lowStockThreshold: 1000, costPerUnit: 0.03 },

    // Tortillas & Bread
    { id: "ing-corn-tortilla", name: "Corn Tortilla", nameEs: "Tortilla de Maíz", unit: "units", currentStock: 200, lowStockThreshold: 50, costPerUnit: 2 },
    { id: "ing-totopos", name: "Tortilla Chips", nameEs: "Totopos", unit: "g", currentStock: 5000, lowStockThreshold: 1000, costPerUnit: 0.05 },
    { id: "ing-churro-dough", name: "Churro Dough", nameEs: "Masa de Churro", unit: "g", currentStock: 3000, lowStockThreshold: 800, costPerUnit: 0.03 },

    // Sauces & Condiments
    { id: "ing-salsa-verde", name: "Salsa Verde", nameEs: "Salsa Verde", unit: "ml", currentStock: 3000, lowStockThreshold: 800, costPerUnit: 0.04 },
    { id: "ing-salsa-roja", name: "Salsa Roja", nameEs: "Salsa Roja", unit: "ml", currentStock: 3000, lowStockThreshold: 800, costPerUnit: 0.04 },
    { id: "ing-chocolate-sauce", name: "Chocolate Sauce", nameEs: "Salsa de Chocolate", unit: "ml", currentStock: 2000, lowStockThreshold: 500, costPerUnit: 0.08 },

    // Alcohol & Spirits
    { id: "ing-tequila", name: "Tequila Blanco", nameEs: "Tequila Blanco", unit: "ml", currentStock: 4500, lowStockThreshold: 1000, costPerUnit: 0.35 },
    { id: "ing-mezcal", name: "Mezcal", nameEs: "Mezcal", unit: "ml", currentStock: 3000, lowStockThreshold: 750, costPerUnit: 0.55 },
    { id: "ing-triple-sec", name: "Triple Sec", nameEs: "Triple Sec", unit: "ml", currentStock: 3000, lowStockThreshold: 750, costPerUnit: 0.15 },
    { id: "ing-angostura", name: "Angostura Bitters", nameEs: "Amargos Angostura", unit: "ml", currentStock: 500, lowStockThreshold: 100, costPerUnit: 0.80 },

    // Mixers & Non-Alcoholic
    { id: "ing-grapefruit-soda", name: "Grapefruit Soda", nameEs: "Refresco de Toronja", unit: "ml", currentStock: 12000, lowStockThreshold: 3000, costPerUnit: 0.02 },
    { id: "ing-simple-syrup", name: "Simple Syrup", nameEs: "Jarabe Natural", unit: "ml", currentStock: 3000, lowStockThreshold: 750, costPerUnit: 0.02 },
    { id: "ing-sugar", name: "Sugar", nameEs: "Azúcar", unit: "g", currentStock: 5000, lowStockThreshold: 1000, costPerUnit: 0.02 },
    { id: "ing-cinnamon", name: "Cinnamon", nameEs: "Canela", unit: "g", currentStock: 500, lowStockThreshold: 100, costPerUnit: 0.15 },
    { id: "ing-rice", name: "Rice", nameEs: "Arroz", unit: "g", currentStock: 5000, lowStockThreshold: 1500, costPerUnit: 0.03 },
    { id: "ing-ice", name: "Ice", nameEs: "Hielo", unit: "g", currentStock: 20000, lowStockThreshold: 5000, costPerUnit: 0.005 },

    // Beer (tracked as units)
    { id: "ing-corona-bottle", name: "Corona Bottle", nameEs: "Botella Corona", unit: "units", currentStock: 48, lowStockThreshold: 12, costPerUnit: 28 },
    { id: "ing-modelo-bottle", name: "Modelo Bottle", nameEs: "Botella Modelo", unit: "units", currentStock: 48, lowStockThreshold: 12, costPerUnit: 28 },

    // Eggs & basics
    { id: "ing-egg", name: "Egg", nameEs: "Huevo", unit: "units", currentStock: 60, lowStockThreshold: 15, costPerUnit: 5 },
    { id: "ing-flour", name: "Flour", nameEs: "Harina", unit: "g", currentStock: 5000, lowStockThreshold: 1000, costPerUnit: 0.02 },
    { id: "ing-oil", name: "Vegetable Oil", nameEs: "Aceite Vegetal", unit: "ml", currentStock: 5000, lowStockThreshold: 1500, costPerUnit: 0.03 },
    { id: "ing-salt", name: "Salt", nameEs: "Sal", unit: "g", currentStock: 3000, lowStockThreshold: 500, costPerUnit: 0.01 },
  ];

  console.log("Creating ingredients...");
  for (const ing of ingredientData) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {
        name: ing.name,
        nameEs: ing.nameEs,
        unit: ing.unit,
        currentStock: ing.currentStock,
        lowStockThreshold: ing.lowStockThreshold,
        costPerUnit: ing.costPerUnit,
      },
      create: ing,
    });
  }
  console.log(`Created ${ingredientData.length} ingredients`);

  // ─── Link Ingredients to Menu Items ───────────────────────────
  // Find all menu items by name
  const menuItems = await prisma.menuItem.findMany({ where: { active: true } });
  const itemMap: Record<string, string> = {};
  for (const mi of menuItems) {
    itemMap[mi.name] = mi.id;
  }

  // Define ingredient links: menuItemName → [{ ingredientId, quantity }]
  const links: Record<string, { ingredientId: string; quantity: number }[]> = {
    "Guacamole & Chips": [
      { ingredientId: "ing-avocado", quantity: 3 },        // 3 avocados
      { ingredientId: "ing-totopos", quantity: 150 },      // 150g chips
      { ingredientId: "ing-onion", quantity: 0.5 },        // half onion
      { ingredientId: "ing-cilantro", quantity: 15 },      // 15g cilantro
      { ingredientId: "ing-lime", quantity: 2 },           // 2 limes
      { ingredientId: "ing-jalapeno", quantity: 1 },       // 1 jalapeño
      { ingredientId: "ing-tomato", quantity: 1 },         // 1 tomato
      { ingredientId: "ing-salt", quantity: 3 },           // 3g salt
    ],
    "Ceviche": [
      { ingredientId: "ing-shrimp", quantity: 180 },       // 180g shrimp
      { ingredientId: "ing-lime", quantity: 4 },           // 4 limes
      { ingredientId: "ing-onion", quantity: 0.5 },        // half onion
      { ingredientId: "ing-cilantro", quantity: 10 },      // 10g cilantro
      { ingredientId: "ing-tomato", quantity: 1 },         // 1 tomato
      { ingredientId: "ing-jalapeno", quantity: 1 },       // 1 jalapeño
      { ingredientId: "ing-avocado", quantity: 0.5 },      // half avocado
      { ingredientId: "ing-totopos", quantity: 60 },       // 60g chips on side
    ],
    "Tacos al Pastor": [
      { ingredientId: "ing-pork-pastor", quantity: 250 },  // 250g pork
      { ingredientId: "ing-corn-tortilla", quantity: 3 },  // 3 tortillas
      { ingredientId: "ing-pineapple", quantity: 60 },     // 60g pineapple
      { ingredientId: "ing-onion", quantity: 0.5 },        // half onion
      { ingredientId: "ing-cilantro", quantity: 10 },      // 10g cilantro
      { ingredientId: "ing-lime", quantity: 1 },           // 1 lime
      { ingredientId: "ing-salsa-roja", quantity: 30 },    // 30ml salsa
    ],
    "Grilled Sea Bass": [
      { ingredientId: "ing-sea-bass", quantity: 220 },     // 220g fillet
      { ingredientId: "ing-seasonal-veg", quantity: 150 }, // 150g vegetables
      { ingredientId: "ing-lime", quantity: 1 },           // 1 lime
      { ingredientId: "ing-oil", quantity: 15 },           // 15ml oil
      { ingredientId: "ing-salt", quantity: 3 },           // 3g salt
    ],
    "Enchiladas Verdes": [
      { ingredientId: "ing-chicken", quantity: 200 },      // 200g chicken
      { ingredientId: "ing-corn-tortilla", quantity: 3 },  // 3 tortillas
      { ingredientId: "ing-salsa-verde", quantity: 120 },  // 120ml salsa verde
      { ingredientId: "ing-cream", quantity: 40 },         // 40ml sour cream
      { ingredientId: "ing-cheese", quantity: 50 },        // 50g cheese
      { ingredientId: "ing-onion", quantity: 0.25 },       // quarter onion
    ],
    "Tres Leches Cake": [
      { ingredientId: "ing-milk", quantity: 100 },         // 100ml whole milk
      { ingredientId: "ing-condensed-milk", quantity: 80 }, // 80ml condensed
      { ingredientId: "ing-evap-milk", quantity: 80 },     // 80ml evaporated
      { ingredientId: "ing-egg", quantity: 2 },            // 2 eggs
      { ingredientId: "ing-flour", quantity: 60 },         // 60g flour
      { ingredientId: "ing-sugar", quantity: 40 },         // 40g sugar
      { ingredientId: "ing-cream", quantity: 50 },         // 50ml cream topping
    ],
    "Churros": [
      { ingredientId: "ing-churro-dough", quantity: 150 }, // 150g dough
      { ingredientId: "ing-chocolate-sauce", quantity: 60 }, // 60ml chocolate
      { ingredientId: "ing-sugar", quantity: 20 },         // 20g sugar
      { ingredientId: "ing-cinnamon", quantity: 3 },       // 3g cinnamon
      { ingredientId: "ing-oil", quantity: 200 },          // 200ml frying oil
    ],
    "Margarita": [
      { ingredientId: "ing-tequila", quantity: 60 },       // 60ml tequila
      { ingredientId: "ing-triple-sec", quantity: 30 },    // 30ml triple sec
      { ingredientId: "ing-lime", quantity: 2 },           // 2 limes
      { ingredientId: "ing-simple-syrup", quantity: 15 },  // 15ml syrup
      { ingredientId: "ing-ice", quantity: 200 },          // 200g ice
      { ingredientId: "ing-salt", quantity: 2 },           // 2g rim salt
    ],
    "Paloma": [
      { ingredientId: "ing-tequila", quantity: 60 },       // 60ml tequila
      { ingredientId: "ing-grapefruit-soda", quantity: 150 }, // 150ml soda
      { ingredientId: "ing-lime", quantity: 1 },           // 1 lime
      { ingredientId: "ing-salt", quantity: 2 },           // 2g rim salt
      { ingredientId: "ing-ice", quantity: 200 },          // 200g ice
    ],
    "Mezcal Old Fashioned": [
      { ingredientId: "ing-mezcal", quantity: 60 },        // 60ml mezcal
      { ingredientId: "ing-simple-syrup", quantity: 10 },  // 10ml syrup
      { ingredientId: "ing-angostura", quantity: 3 },      // 3ml bitters
      { ingredientId: "ing-ice", quantity: 150 },          // 150g ice
    ],
    "Corona": [
      { ingredientId: "ing-corona-bottle", quantity: 1 },  // 1 bottle
      { ingredientId: "ing-lime", quantity: 0.5 },         // half lime wedge
    ],
    "Modelo Especial": [
      { ingredientId: "ing-modelo-bottle", quantity: 1 },  // 1 bottle
    ],
    "Agua de Horchata": [
      { ingredientId: "ing-rice", quantity: 30 },          // 30g rice base
      { ingredientId: "ing-milk", quantity: 100 },         // 100ml milk
      { ingredientId: "ing-sugar", quantity: 25 },         // 25g sugar
      { ingredientId: "ing-cinnamon", quantity: 2 },       // 2g cinnamon
      { ingredientId: "ing-ice", quantity: 200 },          // 200g ice
    ],
    "Limonada": [
      { ingredientId: "ing-lime", quantity: 3 },           // 3 limes
      { ingredientId: "ing-sugar", quantity: 25 },         // 25g sugar
      { ingredientId: "ing-ice", quantity: 200 },          // 200g ice
    ],
  };

  console.log("\nLinking ingredients to menu items...");
  for (const [itemName, ingredients] of Object.entries(links)) {
    const menuItemId = itemMap[itemName];
    if (!menuItemId) {
      console.warn(`  ⚠ Menu item not found: ${itemName}`);
      continue;
    }

    // Delete existing links for this item first
    await prisma.menuItemIngredient.deleteMany({ where: { menuItemId } });

    // Create new links
    for (const link of ingredients) {
      await prisma.menuItemIngredient.create({
        data: {
          menuItemId,
          ingredientId: link.ingredientId,
          quantity: link.quantity,
        },
      });
    }
    console.log(`  ✓ ${itemName}: ${ingredients.length} ingredients`);
  }

  console.log("\nDone! Inventory seeded with ingredients and menu item links.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
