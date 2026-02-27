-- AlterTable
ALTER TABLE "RestaurantTable" ADD COLUMN     "posX" DOUBLE PRECISION,
ADD COLUMN     "posY" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "lowStockThreshold" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "RestaurantSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ingredient_active_idx" ON "Ingredient"("active");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_menuItemId_idx" ON "MenuItemIngredient"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_ingredientId_idx" ON "MenuItemIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_ingredientId_key" ON "MenuItemIngredient"("menuItemId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantSetting_key_key" ON "RestaurantSetting"("key");

-- CreateIndex
CREATE INDEX "RestaurantSetting_key_idx" ON "RestaurantSetting"("key");

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
