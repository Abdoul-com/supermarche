import Sidebar from "./components/Sidebar.js";
import Header from "./components/Header.js";
import Dashboard from "./pages/Dashboard.js";
import Produits from "./pages/Produits.js";
import Stock from "./pages/Stock.js";
import Ventes from "./pages/Ventes.js";
import Clients from "./pages/Clients.js";
import Parametres from "./pages/Parametres.js";

const pageComponents = {
  dashboard: Dashboard,
  produits: Produits,
  stock: Stock,
  ventes: Ventes,
  clients: Clients,
  parametres: Parametres,
};

export default function App(activePage = "dashboard", dashboardData = null) {
  const authState = globalThis.__supermarcheAuth || {};
  const profile = authState.profile || {};
  const fullName =
    [profile.prenom, profile.nom].filter(Boolean).join(" ") ||
    authState.user?.user_metadata?.full_name ||
    "Utilisateur";
  const roleName = authState.roleName || "Rôle";
  const PageComponent = pageComponents[activePage] || Dashboard;
  const pageTitles = {
    dashboard: {
      title: "Tableau de bord",
      subtitle: "Vue générale de l’activité du supermarché",
    },
    produits: { title: "Produits", subtitle: "Gestion du catalogue" },
    stock: { title: "Stock", subtitle: "Suivi des niveaux de stock" },
    ventes: {
      title: "Ventes / Caisse",
      subtitle: "Caisse et enregistrement des ventes",
    },
    clients: { title: "Clients", subtitle: "Base clients rapide" },
    parametres: { title: "Paramètres", subtitle: "Configuration du magasin" },
  };

  const current = pageTitles[activePage] || pageTitles.dashboard;
  const actions =
    activePage === "dashboard"
      ? [
          { label: "Actualiser", variant: "btn-secondary", action: "refresh" },
          {
            label: "Nouvelle vente",
            variant: "btn-primary",
            action: "new-sale",
          },
        ]
      : [
          { label: "Actualiser", variant: "btn-secondary", action: "refresh" },
          {
            label: "Nouvelle vente",
            variant: "btn-primary",
            action: "new-sale",
          },
        ];

  return `
    <div class="app-shell">
      ${Sidebar({ active: activePage })}
      <main class="main-panel">
        ${Header({
          title: current.title,
          subtitle: current.subtitle,
          actions,
          userName: fullName,
          userRole: roleName,
        })}
        ${PageComponent(dashboardData ?? { loading: false, error: null })}
      </main>
    </div>
  `;
}
