import { PrismaClient, UserRole, ItemDestination } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@rms.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@rms.com",
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log("Created admin:", admin.email);

  // Create sample servers with PINs
  const serverPins = [
    { name: "Maria", pin: "1234" },
    { name: "Carlos", pin: "5678" },
    { name: "Ana", pin: "9012" },
  ];

  for (const s of serverPins) {
    const hashedPin = await hash(s.pin, 12);
    const server = await prisma.user.upsert({
      where: { id: `seed-server-${s.name.toLowerCase()}` },
      update: {},
      create: {
        id: `seed-server-${s.name.toLowerCase()}`,
        name: s.name,
        pin: hashedPin,
        role: UserRole.SERVER,
      },
    });
    console.log(`Created server: ${server.name} (PIN: ${s.pin})`);
  }

  // Create menu categories
  const categories = [
    { name: "Appetizers", nameEs: "Entradas", sortOrder: 1 },
    { name: "Main Courses", nameEs: "Platos Fuertes", sortOrder: 2 },
    { name: "Desserts", nameEs: "Postres", sortOrder: 3 },
    { name: "Cocktails", nameEs: "Cocteles", sortOrder: 4 },
    { name: "Beer", nameEs: "Cerveza", sortOrder: 5 },
    { name: "Non-Alcoholic", nameEs: "Sin Alcohol", sortOrder: 6 },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const category = await prisma.menuCategory.create({ data: cat });
    createdCategories[cat.name] = category.id;
    console.log(`Created category: ${cat.name}`);
  }

  // Create menu items with modifiers
  const items = [
    {
      name: "Guacamole & Chips",
      nameEs: "Guacamole y Totopos",
      price: 145,
      destination: ItemDestination.KITCHEN,
      category: "Appetizers",
      modifiers: [
        { name: "Extra spicy", nameEs: "Extra picante", priceAdj: 0 },
        { name: "No cilantro", nameEs: "Sin cilantro", priceAdj: 0 },
      ],
    },
    {
      name: "Ceviche",
      nameEs: "Ceviche",
      price: 195,
      destination: ItemDestination.KITCHEN,
      category: "Appetizers",
      modifiers: [
        { name: "Extra lime", nameEs: "Extra limón", priceAdj: 0 },
      ],
    },
    {
      name: "Tacos al Pastor",
      nameEs: "Tacos al Pastor",
      description: "3 tacos with pineapple and onion",
      descriptionEs: "3 tacos con piña y cebolla",
      price: 185,
      destination: ItemDestination.KITCHEN,
      category: "Main Courses",
      modifiers: [
        { name: "No onion", nameEs: "Sin cebolla", priceAdj: 0 },
        { name: "Extra salsa", nameEs: "Extra salsa", priceAdj: 15 },
        { name: "Add cheese", nameEs: "Con queso", priceAdj: 25 },
      ],
    },
    {
      name: "Grilled Sea Bass",
      nameEs: "Robalo a la Parrilla",
      description: "With seasonal vegetables",
      descriptionEs: "Con verduras de temporada",
      price: 320,
      destination: ItemDestination.KITCHEN,
      category: "Main Courses",
      modifiers: [],
    },
    {
      name: "Enchiladas Verdes",
      nameEs: "Enchiladas Verdes",
      price: 175,
      destination: ItemDestination.KITCHEN,
      category: "Main Courses",
      modifiers: [
        { name: "Extra cream", nameEs: "Extra crema", priceAdj: 15 },
      ],
    },
    {
      name: "Tres Leches Cake",
      nameEs: "Pastel de Tres Leches",
      price: 120,
      destination: ItemDestination.KITCHEN,
      category: "Desserts",
      modifiers: [],
    },
    {
      name: "Churros",
      nameEs: "Churros",
      description: "With chocolate sauce",
      descriptionEs: "Con salsa de chocolate",
      price: 95,
      destination: ItemDestination.KITCHEN,
      category: "Desserts",
      modifiers: [],
    },
    {
      name: "Margarita",
      nameEs: "Margarita",
      price: 165,
      destination: ItemDestination.BAR,
      category: "Cocktails",
      modifiers: [
        { name: "On the rocks", nameEs: "En las rocas", priceAdj: 0 },
        { name: "Frozen", nameEs: "Frozen", priceAdj: 0 },
        { name: "Spicy rim", nameEs: "Borde picante", priceAdj: 15 },
      ],
    },
    {
      name: "Paloma",
      nameEs: "Paloma",
      price: 145,
      destination: ItemDestination.BAR,
      category: "Cocktails",
      modifiers: [],
    },
    {
      name: "Mezcal Old Fashioned",
      nameEs: "Old Fashioned de Mezcal",
      price: 195,
      destination: ItemDestination.BAR,
      category: "Cocktails",
      modifiers: [],
    },
    {
      name: "Corona",
      nameEs: "Corona",
      price: 65,
      destination: ItemDestination.BAR,
      category: "Beer",
      modifiers: [],
    },
    {
      name: "Modelo Especial",
      nameEs: "Modelo Especial",
      price: 65,
      destination: ItemDestination.BAR,
      category: "Beer",
      modifiers: [],
    },
    {
      name: "Agua de Horchata",
      nameEs: "Agua de Horchata",
      price: 55,
      destination: ItemDestination.BAR,
      category: "Non-Alcoholic",
      modifiers: [],
    },
    {
      name: "Limonada",
      nameEs: "Limonada",
      price: 45,
      destination: ItemDestination.BAR,
      category: "Non-Alcoholic",
      modifiers: [
        { name: "Sparkling", nameEs: "Con gas", priceAdj: 10 },
      ],
    },
  ];

  const createdItems: Record<string, string> = {};
  for (const item of items) {
    const { modifiers, category, ...itemData } = item;
    const created = await prisma.menuItem.create({
      data: {
        ...itemData,
        categoryId: createdCategories[category],
        modifiers: {
          create: modifiers,
        },
      },
    });
    createdItems[created.name] = created.id;
    console.log(`Created item: ${created.name} (${category})`);
  }

  // Create tables
  for (let i = 1; i <= 12; i++) {
    await prisma.restaurantTable.create({
      data: {
        number: i,
        name: i <= 8 ? `Interior ${i}` : `Terraza ${i - 8}`,
        seats: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }
  console.log("Created 12 tables");

  // ─── Create Ingredients (Inventory) ─────────────────────────────
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

  for (const ing of ingredientData) {
    await prisma.ingredient.create({ data: ing });
  }
  console.log(`Created ${ingredientData.length} ingredients`);

  // ─── Link Ingredients to Menu Items ─────────────────────────────
  const ingredientLinks: Record<string, { ingredientId: string; quantity: number }[]> = {
    "Guacamole & Chips": [
      { ingredientId: "ing-avocado", quantity: 3 },
      { ingredientId: "ing-totopos", quantity: 150 },
      { ingredientId: "ing-onion", quantity: 0.5 },
      { ingredientId: "ing-cilantro", quantity: 15 },
      { ingredientId: "ing-lime", quantity: 2 },
      { ingredientId: "ing-jalapeno", quantity: 1 },
      { ingredientId: "ing-tomato", quantity: 1 },
      { ingredientId: "ing-salt", quantity: 3 },
    ],
    "Ceviche": [
      { ingredientId: "ing-shrimp", quantity: 180 },
      { ingredientId: "ing-lime", quantity: 4 },
      { ingredientId: "ing-onion", quantity: 0.5 },
      { ingredientId: "ing-cilantro", quantity: 10 },
      { ingredientId: "ing-tomato", quantity: 1 },
      { ingredientId: "ing-jalapeno", quantity: 1 },
      { ingredientId: "ing-avocado", quantity: 0.5 },
      { ingredientId: "ing-totopos", quantity: 60 },
    ],
    "Tacos al Pastor": [
      { ingredientId: "ing-pork-pastor", quantity: 250 },
      { ingredientId: "ing-corn-tortilla", quantity: 3 },
      { ingredientId: "ing-pineapple", quantity: 60 },
      { ingredientId: "ing-onion", quantity: 0.5 },
      { ingredientId: "ing-cilantro", quantity: 10 },
      { ingredientId: "ing-lime", quantity: 1 },
      { ingredientId: "ing-salsa-roja", quantity: 30 },
    ],
    "Grilled Sea Bass": [
      { ingredientId: "ing-sea-bass", quantity: 220 },
      { ingredientId: "ing-seasonal-veg", quantity: 150 },
      { ingredientId: "ing-lime", quantity: 1 },
      { ingredientId: "ing-oil", quantity: 15 },
      { ingredientId: "ing-salt", quantity: 3 },
    ],
    "Enchiladas Verdes": [
      { ingredientId: "ing-chicken", quantity: 200 },
      { ingredientId: "ing-corn-tortilla", quantity: 3 },
      { ingredientId: "ing-salsa-verde", quantity: 120 },
      { ingredientId: "ing-cream", quantity: 40 },
      { ingredientId: "ing-cheese", quantity: 50 },
      { ingredientId: "ing-onion", quantity: 0.25 },
    ],
    "Tres Leches Cake": [
      { ingredientId: "ing-milk", quantity: 100 },
      { ingredientId: "ing-condensed-milk", quantity: 80 },
      { ingredientId: "ing-evap-milk", quantity: 80 },
      { ingredientId: "ing-egg", quantity: 2 },
      { ingredientId: "ing-flour", quantity: 60 },
      { ingredientId: "ing-sugar", quantity: 40 },
      { ingredientId: "ing-cream", quantity: 50 },
    ],
    "Churros": [
      { ingredientId: "ing-churro-dough", quantity: 150 },
      { ingredientId: "ing-chocolate-sauce", quantity: 60 },
      { ingredientId: "ing-sugar", quantity: 20 },
      { ingredientId: "ing-cinnamon", quantity: 3 },
      { ingredientId: "ing-oil", quantity: 200 },
    ],
    "Margarita": [
      { ingredientId: "ing-tequila", quantity: 60 },
      { ingredientId: "ing-triple-sec", quantity: 30 },
      { ingredientId: "ing-lime", quantity: 2 },
      { ingredientId: "ing-simple-syrup", quantity: 15 },
      { ingredientId: "ing-ice", quantity: 200 },
      { ingredientId: "ing-salt", quantity: 2 },
    ],
    "Paloma": [
      { ingredientId: "ing-tequila", quantity: 60 },
      { ingredientId: "ing-grapefruit-soda", quantity: 150 },
      { ingredientId: "ing-lime", quantity: 1 },
      { ingredientId: "ing-salt", quantity: 2 },
      { ingredientId: "ing-ice", quantity: 200 },
    ],
    "Mezcal Old Fashioned": [
      { ingredientId: "ing-mezcal", quantity: 60 },
      { ingredientId: "ing-simple-syrup", quantity: 10 },
      { ingredientId: "ing-angostura", quantity: 3 },
      { ingredientId: "ing-ice", quantity: 150 },
    ],
    "Corona": [
      { ingredientId: "ing-corona-bottle", quantity: 1 },
      { ingredientId: "ing-lime", quantity: 0.5 },
    ],
    "Modelo Especial": [
      { ingredientId: "ing-modelo-bottle", quantity: 1 },
    ],
    "Agua de Horchata": [
      { ingredientId: "ing-rice", quantity: 30 },
      { ingredientId: "ing-milk", quantity: 100 },
      { ingredientId: "ing-sugar", quantity: 25 },
      { ingredientId: "ing-cinnamon", quantity: 2 },
      { ingredientId: "ing-ice", quantity: 200 },
    ],
    "Limonada": [
      { ingredientId: "ing-lime", quantity: 3 },
      { ingredientId: "ing-sugar", quantity: 25 },
      { ingredientId: "ing-ice", quantity: 200 },
    ],
  };

  for (const [itemName, ingredients] of Object.entries(ingredientLinks)) {
    const menuItemId = createdItems[itemName];
    if (!menuItemId) continue;
    for (const link of ingredients) {
      await prisma.menuItemIngredient.create({
        data: { menuItemId, ingredientId: link.ingredientId, quantity: link.quantity },
      });
    }
    console.log(`Linked ${ingredients.length} ingredients to ${itemName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
