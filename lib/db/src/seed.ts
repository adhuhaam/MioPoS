import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

  const [outlet1] = await db.insert(schema.outletsTable).values({
    name: "Downtown Branch",
    address: "123 Main Street, Downtown",
    phone: "+1 555-0101",
    taxRate: "8.5",
    currency: "USD",
  }).returning();

  const [outlet2] = await db.insert(schema.outletsTable).values({
    name: "Midtown Branch",
    address: "456 Park Avenue, Midtown",
    phone: "+1 555-0202",
    taxRate: "8.5",
    currency: "USD",
  }).returning();

  const [outlet3] = await db.insert(schema.outletsTable).values({
    name: "Airport Lounge",
    address: "Terminal 2, International Airport",
    phone: "+1 555-0303",
    taxRate: "10.0",
    currency: "USD",
  }).returning();

  console.log("Outlets created:", outlet1.id, outlet2.id, outlet3.id);

  const [superAdmin] = await db.insert(schema.staffTable).values({
    outletId: null,
    name: "Alex Chen",
    role: "super_admin",
    pin: "1234",
  }).returning();

  const [mgr1] = await db.insert(schema.staffTable).values({
    outletId: outlet1.id,
    name: "Maria Garcia",
    role: "manager",
    pin: "2222",
  }).returning();

  const [cashier1] = await db.insert(schema.staffTable).values({
    outletId: outlet1.id,
    name: "James Wilson",
    role: "cashier",
    pin: "3333",
  }).returning();

  const [kitchen1] = await db.insert(schema.staffTable).values({
    outletId: outlet1.id,
    name: "Sofia Rossi",
    role: "kitchen",
    pin: "4444",
  }).returning();

  await db.insert(schema.staffTable).values([
    { outletId: outlet2.id, name: "Liam Johnson", role: "manager", pin: "5555" },
    { outletId: outlet2.id, name: "Emma Brown", role: "cashier", pin: "6666" },
    { outletId: outlet3.id, name: "Noah Davis", role: "manager", pin: "7777" },
    { outletId: outlet3.id, name: "Olivia Lee", role: "cashier", pin: "8888" },
  ]);

  console.log("Staff created");

  const [cat1] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet1.id, name: "Starters", sortOrder: 0 }).returning();
  const [cat2] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet1.id, name: "Mains", sortOrder: 1 }).returning();
  const [cat3] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet1.id, name: "Desserts", sortOrder: 2 }).returning();
  const [cat4] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet1.id, name: "Drinks", sortOrder: 3 }).returning();

  await db.insert(schema.menuItemsTable).values([
    { categoryId: cat1.id, outletId: outlet1.id, name: "Garlic Bread", description: "Toasted with herb butter", price: "6.50" },
    { categoryId: cat1.id, outletId: outlet1.id, name: "Caesar Salad", description: "Romaine, parmesan, croutons", price: "12.00" },
    { categoryId: cat1.id, outletId: outlet1.id, name: "Soup of the Day", description: "Ask your server", price: "8.50" },
    { categoryId: cat1.id, outletId: outlet1.id, name: "Bruschetta", description: "Tomato, basil, mozzarella", price: "9.00" },
    { categoryId: cat2.id, outletId: outlet1.id, name: "Grilled Salmon", description: "With lemon butter sauce", price: "28.00" },
    { categoryId: cat2.id, outletId: outlet1.id, name: "Ribeye Steak", description: "12oz, with fries", price: "42.00" },
    { categoryId: cat2.id, outletId: outlet1.id, name: "Pasta Carbonara", description: "Pancetta, egg, pecorino", price: "18.00" },
    { categoryId: cat2.id, outletId: outlet1.id, name: "Margherita Pizza", description: "San Marzano tomatoes, buffalo mozzarella", price: "22.00" },
    { categoryId: cat2.id, outletId: outlet1.id, name: "Chicken Parmigiana", description: "Crumbed chicken, napolitana sauce", price: "24.00" },
    { categoryId: cat3.id, outletId: outlet1.id, name: "Tiramisu", description: "Classic Italian dessert", price: "9.00" },
    { categoryId: cat3.id, outletId: outlet1.id, name: "Chocolate Lava Cake", description: "Served with vanilla ice cream", price: "11.00" },
    { categoryId: cat3.id, outletId: outlet1.id, name: "Panna Cotta", description: "Raspberry coulis", price: "8.00" },
    { categoryId: cat4.id, outletId: outlet1.id, name: "Sparkling Water", description: "500ml", price: "4.00" },
    { categoryId: cat4.id, outletId: outlet1.id, name: "House Wine (Glass)", description: "Red or white", price: "10.00" },
    { categoryId: cat4.id, outletId: outlet1.id, name: "Craft Beer", description: "Local brewery selection", price: "8.00" },
    { categoryId: cat4.id, outletId: outlet1.id, name: "Soft Drink", description: "Coke, Sprite, OJ", price: "4.50" },
  ]);

  const [mcat1] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet2.id, name: "Appetizers", sortOrder: 0 }).returning();
  const [mcat2] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet2.id, name: "Mains", sortOrder: 1 }).returning();
  const [mcat3] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet2.id, name: "Beverages", sortOrder: 2 }).returning();

  await db.insert(schema.menuItemsTable).values([
    { categoryId: mcat1.id, outletId: outlet2.id, name: "Spring Rolls", price: "8.00" },
    { categoryId: mcat1.id, outletId: outlet2.id, name: "Calamari", price: "14.00" },
    { categoryId: mcat2.id, outletId: outlet2.id, name: "Beef Burger", description: "Double patty, cheese", price: "20.00" },
    { categoryId: mcat2.id, outletId: outlet2.id, name: "Fish & Chips", price: "18.00" },
    { categoryId: mcat2.id, outletId: outlet2.id, name: "Veggie Bowl", price: "16.00" },
    { categoryId: mcat3.id, outletId: outlet2.id, name: "Fresh Juice", price: "6.00" },
    { categoryId: mcat3.id, outletId: outlet2.id, name: "Coffee", price: "4.50" },
  ]);

  const [acat1] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet3.id, name: "Snacks", sortOrder: 0 }).returning();
  const [acat2] = await db.insert(schema.menuCategoriesTable).values({ outletId: outlet3.id, name: "Drinks", sortOrder: 1 }).returning();

  await db.insert(schema.menuItemsTable).values([
    { categoryId: acat1.id, outletId: outlet3.id, name: "Mixed Nuts", price: "7.00" },
    { categoryId: acat1.id, outletId: outlet3.id, name: "Cheese Plate", price: "16.00" },
    { categoryId: acat2.id, outletId: outlet3.id, name: "Bottled Water", price: "3.00" },
    { categoryId: acat2.id, outletId: outlet3.id, name: "Cocktail", description: "Ask our bartender", price: "14.00" },
  ]);

  console.log("Menu created");

  await db.insert(schema.tablesTable).values([
    { outletId: outlet1.id, name: "Table 1", capacity: 2 },
    { outletId: outlet1.id, name: "Table 2", capacity: 4 },
    { outletId: outlet1.id, name: "Table 3", capacity: 4 },
    { outletId: outlet1.id, name: "Table 4", capacity: 6 },
    { outletId: outlet1.id, name: "Table 5", capacity: 6 },
    { outletId: outlet1.id, name: "Table 6", capacity: 8 },
    { outletId: outlet1.id, name: "Bar 1", capacity: 2 },
    { outletId: outlet1.id, name: "Bar 2", capacity: 2 },
    { outletId: outlet1.id, name: "Patio 1", capacity: 4 },
    { outletId: outlet1.id, name: "Patio 2", capacity: 4 },
    { outletId: outlet2.id, name: "Table 1", capacity: 2 },
    { outletId: outlet2.id, name: "Table 2", capacity: 4 },
    { outletId: outlet2.id, name: "Table 3", capacity: 4 },
    { outletId: outlet2.id, name: "Table 4", capacity: 6 },
    { outletId: outlet2.id, name: "Table 5", capacity: 8 },
    { outletId: outlet3.id, name: "Lounge A", capacity: 4 },
    { outletId: outlet3.id, name: "Lounge B", capacity: 4 },
    { outletId: outlet3.id, name: "Bar 1", capacity: 2 },
    { outletId: outlet3.id, name: "Bar 2", capacity: 2 },
  ]);

  console.log("Tables created");
  console.log("Seed complete!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Super Admin - Alex Chen: outlet = any, PIN = 1234");
  console.log("  Manager (Downtown) - Maria Garcia: outlet = Downtown Branch, PIN = 2222");
  console.log("  Cashier (Downtown) - James Wilson: outlet = Downtown Branch, PIN = 3333");
  console.log("  Kitchen (Downtown) - Sofia Rossi: outlet = Downtown Branch, PIN = 4444");

  await pool.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
