import { supabase } from "./supabase.js";

function normalize(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function getSettings() {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure. Verifiez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Impossible de charger les parametres du supermarche.");
  }

  return data || null;
}

export async function updateSettings(data = {}) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configure. Verifiez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }

  const nomSupermarche = normalize(data.nom_supermarche);
  const telephone = normalize(data.telephone);
  const email = normalize(data.email);
  const adresse = normalize(data.adresse);
  const devise = normalize(data.devise || "FCFA");

  if (!nomSupermarche) {
    throw new Error("Le nom du supermarche est obligatoire.");
  }

  if (email && !email.includes("@")) {
    throw new Error("L'email n'est pas valide.");
  }

  if (telephone && telephone.length < 8) {
    throw new Error("Le telephone est invalide.");
  }

  const selected = await getSettings();
  if (!selected) {
    throw new Error("Aucune configuration disponible dans la table settings.");
  }

  const payload = {
    nom_supermarche: nomSupermarche || selected.nom_supermarche,
    telephone: telephone || selected.telephone,
    email: email || selected.email,
    adresse: adresse || selected.adresse,
    devise: devise || selected.devise || "FCFA",
    updated_at: new Date().toISOString()
  };

  const { data: updated, error } = await supabase
    .from("settings")
    .update(payload)
    .eq("id", selected.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Impossible de sauvegarder les parametres.");
  }

  return updated;
}
