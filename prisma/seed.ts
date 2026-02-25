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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
