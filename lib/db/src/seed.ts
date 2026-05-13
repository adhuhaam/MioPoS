import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FK constraints)
  await db.delete(schema.menuItemModifierGroupsTable);
  await db.delete(schema.orderItemModifiersTable);
  await db.delete(schema.orderItemsTable);
  await db.delete(schema.ordersTable);
  await db.delete(schema.modifierOptionsTable);
  await db.delete(schema.modifierGroupsTable);
  await db.delete(schema.menuItemsTable);
  await db.delete(schema.menuCategoriesTable);
  await db.delete(schema.staffTable);
  await db.delete(schema.tablesTable);
  await db.delete(schema.outletsTable);

  // Exactly 2 demo outlets
  const [downtown, airport] = await db
    .insert(schema.outletsTable)
    .values([
      { name: "Downtown Branch", address: "123 Main Street, Downtown", phone: "+1 555-0101", taxRate: "8.00", currency: "USD" },
      { name: "Airport Branch",  address: "Terminal 2, International Airport", phone: "+1 555-0202", taxRate: "10.00", currency: "USD" },
    ])
    .returning();

  console.log(`Created outlets: ${downtown.id} (Downtown), ${airport.id} (Airport)`);

  // Exactly 6 tables per outlet
  await db.insert(schema.tablesTable).values([
    { outletId: downtown.id, name: "T1" },
    { outletId: downtown.id, name: "T2" },
    { outletId: downtown.id, name: "T3" },
    { outletId: downtown.id, name: "T4" },
    { outletId: downtown.id, name: "T5" },
    { outletId: downtown.id, name: "T6" },
    { outletId: airport.id, name: "T1" },
    { outletId: airport.id, name: "T2" },
    { outletId: airport.id, name: "T3" },
    { outletId: airport.id, name: "T4" },
    { outletId: airport.id, name: "T5" },
    { outletId: airport.id, name: "T6" },
  ]);
  console.log("Created 6 tables per outlet");

  // Staff — full role coverage per outlet plus one super_admin; PINs hashed with bcrypt
  const ROUNDS = 10;
  const staffDefs = [
    { outletId: null,        name: "Super Admin",      role: "super_admin" as const, rawPin: "0000" },
    { outletId: downtown.id, name: "Downtown Manager", role: "manager"     as const, rawPin: "1111" },
    { outletId: downtown.id, name: "Downtown Cashier", role: "cashier"     as const, rawPin: "2222" },
    { outletId: downtown.id, name: "Downtown Kitchen", role: "kitchen"     as const, rawPin: "3333" },
    { outletId: airport.id,  name: "Airport Manager",  role: "manager"     as const, rawPin: "4444" },
    { outletId: airport.id,  name: "Airport Cashier",  role: "cashier"     as const, rawPin: "5555" },
    { outletId: airport.id,  name: "Airport Kitchen",  role: "kitchen"     as const, rawPin: "6666" },
  ];
  const staffRows = await Promise.all(
    staffDefs.map(async ({ rawPin, ...rest }) => ({
      ...rest,
      pin: await bcrypt.hash(rawPin, ROUNDS),
    }))
  );
  await db.insert(schema.staffTable).values(staffRows);
  console.log("Created staff");

  // ---- Downtown menu ----
  const [dtStarters, dtMains, dtDrinks, dtDesserts] = await db
    .insert(schema.menuCategoriesTable)
    .values([
      { outletId: downtown.id, name: "Starters",  sortOrder: 1 },
      { outletId: downtown.id, name: "Mains",     sortOrder: 2 },
      { outletId: downtown.id, name: "Drinks",    sortOrder: 3 },
      { outletId: downtown.id, name: "Desserts",  sortOrder: 4 },
    ])
    .returning();

  const dtMenuItems = await db
    .insert(schema.menuItemsTable)
    .values([
      { categoryId: dtStarters.id, outletId: downtown.id, name: "Garlic Bread",       price: "6.50" },
      { categoryId: dtStarters.id, outletId: downtown.id, name: "Caesar Salad",       price: "12.00" },
      { categoryId: dtMains.id,    outletId: downtown.id, name: "Grilled Salmon",     price: "28.00" },
      { categoryId: dtMains.id,    outletId: downtown.id, name: "Ribeye Steak",       price: "42.00" },
      { categoryId: dtMains.id,    outletId: downtown.id, name: "Pasta Carbonara",    price: "18.00" },
      { categoryId: dtMains.id,    outletId: downtown.id, name: "Margherita Pizza",   price: "22.00" },
      { categoryId: dtDrinks.id,   outletId: downtown.id, name: "Sparkling Water",    price: "4.00" },
      { categoryId: dtDrinks.id,   outletId: downtown.id, name: "House Wine",         price: "10.00" },
      { categoryId: dtDrinks.id,   outletId: downtown.id, name: "Soft Drink",         price: "4.50" },
      { categoryId: dtDesserts.id, outletId: downtown.id, name: "Tiramisu",           price: "9.00" },
      { categoryId: dtDesserts.id, outletId: downtown.id, name: "Chocolate Lava Cake",price: "11.00" },
    ])
    .returning();

  // Downtown modifier groups
  const [dtSize, dtExtras] = await db
    .insert(schema.modifierGroupsTable)
    .values([
      { outletId: downtown.id, name: "Size",    required: true,  multiSelect: false },
      { outletId: downtown.id, name: "Add-ons", required: false, multiSelect: true  },
    ])
    .returning();

  await db.insert(schema.modifierOptionsTable).values([
    { groupId: dtSize.id,   name: "Regular",      priceAdjustment: "0.00" },
    { groupId: dtSize.id,   name: "Large",         priceAdjustment: "2.50" },
    { groupId: dtExtras.id, name: "Extra Cheese",  priceAdjustment: "1.00" },
    { groupId: dtExtras.id, name: "Bacon Strip",   priceAdjustment: "1.50" },
    { groupId: dtExtras.id, name: "Avocado",       priceAdjustment: "2.00" },
  ]);

  // Assign Size + Add-ons to all mains; Size only to drinks
  const dtMainItems  = dtMenuItems.filter(i => i.categoryId === dtMains.id);
  const dtDrinkItems = dtMenuItems.filter(i => i.categoryId === dtDrinks.id);

  await db.insert(schema.menuItemModifierGroupsTable).values([
    ...dtMainItems.flatMap(item => [
      { menuItemId: item.id, modifierGroupId: dtSize.id   },
      { menuItemId: item.id, modifierGroupId: dtExtras.id },
    ]),
    ...dtDrinkItems.map(item => ({ menuItemId: item.id, modifierGroupId: dtSize.id })),
  ]);

  // ---- Airport menu ----
  const [apMains, apDrinks, apDesserts] = await db
    .insert(schema.menuCategoriesTable)
    .values([
      { outletId: airport.id, name: "Mains",    sortOrder: 1 },
      { outletId: airport.id, name: "Drinks",   sortOrder: 2 },
      { outletId: airport.id, name: "Desserts", sortOrder: 3 },
    ])
    .returning();

  const apMenuItems = await db
    .insert(schema.menuItemsTable)
    .values([
      { categoryId: apMains.id,    outletId: airport.id, name: "Club Sandwich",   price: "13.50" },
      { categoryId: apMains.id,    outletId: airport.id, name: "Caesar Salad",    price: "11.00" },
      { categoryId: apMains.id,    outletId: airport.id, name: "Pasta Marinara",  price: "15.00" },
      { categoryId: apMains.id,    outletId: airport.id, name: "Veggie Bowl",     price: "12.00" },
      { categoryId: apDrinks.id,   outletId: airport.id, name: "Flat White",      price: "5.50"  },
      { categoryId: apDrinks.id,   outletId: airport.id, name: "Smoothie",        price: "6.50"  },
      { categoryId: apDrinks.id,   outletId: airport.id, name: "Sparkling Water", price: "3.00"  },
      { categoryId: apDesserts.id, outletId: airport.id, name: "Fruit Tart",      price: "6.00"  },
      { categoryId: apDesserts.id, outletId: airport.id, name: "Brownie",         price: "4.50"  },
    ])
    .returning();

  // Airport modifier groups
  const [apTemp, apMilk] = await db
    .insert(schema.modifierGroupsTable)
    .values([
      { outletId: airport.id, name: "Temperature", required: false, multiSelect: false },
      { outletId: airport.id, name: "Milk Type",   required: false, multiSelect: false },
    ])
    .returning();

  await db.insert(schema.modifierOptionsTable).values([
    { groupId: apTemp.id, name: "Hot",        priceAdjustment: "0.00" },
    { groupId: apTemp.id, name: "Cold",       priceAdjustment: "0.00" },
    { groupId: apMilk.id, name: "Full Cream", priceAdjustment: "0.00" },
    { groupId: apMilk.id, name: "Oat Milk",   priceAdjustment: "0.50" },
    { groupId: apMilk.id, name: "Soy Milk",   priceAdjustment: "0.50" },
  ]);

  // Assign Temperature + Milk Type to airport drinks
  const apDrinkItems = apMenuItems.filter(i => i.categoryId === apDrinks.id);
  await db.insert(schema.menuItemModifierGroupsTable).values(
    apDrinkItems.flatMap(item => [
      { menuItemId: item.id, modifierGroupId: apTemp.id },
      { menuItemId: item.id, modifierGroupId: apMilk.id },
    ])
  );

  console.log("Menu, modifiers, and assignments created");
  console.log("\nSeed complete! Demo credentials:");
  console.log("  Super Admin        — any outlet,       PIN: 0000");
  console.log("  Downtown Manager   — Downtown Branch,  PIN: 1111");
  console.log("  Downtown Cashier   — Downtown Branch,  PIN: 2222");
  console.log("  Downtown Kitchen   — Downtown Branch,  PIN: 3333");
  console.log("  Airport Manager    — Airport Branch,   PIN: 4444");
  console.log("  Airport Cashier    — Airport Branch,   PIN: 5555");
  console.log("  Airport Kitchen    — Airport Branch,   PIN: 6666");
}

seed()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => pool.end());
