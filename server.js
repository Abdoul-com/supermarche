import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const fallbackProducts = [
  { id: 1, nom: "Tomates", prix_vente: 2.5, stock_actuel: 30, statut: true },
  { id: 2, nom: "Pain", prix_vente: 3.2, stock_actuel: 18, statut: true },
  { id: 3, nom: "Lait", prix_vente: 4.8, stock_actuel: 22, statut: true },
];

const fallbackCategories = [
  { id: 1, nom: "Fruits & Légumes" },
  { id: 2, nom: "Boulangerie" },
  { id: 3, nom: "Produits laitiers" },
];

app.use(cors());
app.use(express.json());

async function getProductsFromSource() {
  if (!supabase) {
    return fallbackProducts;
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(20);
    if (error) {
      console.warn("Erreur lecture Supabase products:", error.message);
      return fallbackProducts;
    }
    return data && data.length ? data : fallbackProducts;
  } catch (error) {
    console.warn("Exception lecture Supabase products:", error.message);
    return fallbackProducts;
  }
}

async function getCategoriesFromSource() {
  if (!supabase) {
    return fallbackCategories;
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .limit(20);
    if (error) {
      console.warn("Erreur lecture Supabase categories:", error.message);
      return fallbackCategories;
    }
    return data && data.length ? data : fallbackCategories;
  } catch (error) {
    console.warn("Exception lecture Supabase categories:", error.message);
    return fallbackCategories;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "supermarche-manager-api",
    configured: Boolean(supabase),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/products", async (_req, res) => {
  const items = await getProductsFromSource();
  res.json({ items });
});

app.get("/api/categories", async (_req, res) => {
  const items = await getCategoriesFromSource();
  res.json({ items });
});

app.get("/api/dashboard", async (_req, res) => {
  const items = await getProductsFromSource();
  const totalProducts = items.length;
  const totalStock = items.reduce(
    (sum, product) => sum + Number(product.stock_actuel ?? 0),
    0,
  );

  res.json({
    totalProducts,
    totalStock,
    items: items.slice(0, 5),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

export { app };
