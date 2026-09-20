-- Migration de sécurisation RLS pour Supermarché Manager
-- Cette migration est prévue pour être appliquée dans Supabase SQL Editor.
-- Elle ajoute d'abord le lien minimal entre auth.users.id et public.users.auth_user_id,
-- puis active le RLS et crée les politiques de base par rôle.

BEGIN;

-- 1) Lien Auth -> profile utilisateur : ajout minimal et sûr.
--    IMPORTANT : cette colonne est ajoutée uniquement si elle n'existe pas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN auth_user_id UUID;

    CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_idx
      ON public.users(auth_user_id);

    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_user_id_fk
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Récupération du rôle courant, sans exposer de données sensibles.
CREATE OR REPLACE FUNCTION public.current_user_role_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT r.nom
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_roles(role_names text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_user_id = auth.uid()
      AND r.nom = ANY(role_names)
  );
$$;

-- 3) Activation RLS pour les tables métier.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4) Politiques RLS de base par rôle.
-- Roles : lecture pour tout utilisateur authentifié lié à un profil valide.
CREATE POLICY "roles_select_authenticated"
  ON public.roles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Gestionnaire de stock','Comptable'])
  );

-- Users : seuls les profils autorisés peuvent consulter/maj les comptes.
CREATE POLICY "users_select_admin_or_manager"
  ON public.users
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
    OR auth.uid() = auth_user_id
  );

CREATE POLICY "users_insert_admin_or_manager"
  ON public.users
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
  );

CREATE POLICY "users_update_admin_or_self"
  ON public.users
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
    OR auth.uid() = auth_user_id
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
    OR auth.uid() = auth_user_id
  );

-- Categories : lecture pour les rôles de gestion/stock, écriture pour gestion.
CREATE POLICY "categories_select_authenticated_roles"
  ON public.categories
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "categories_write_admin_or_manager"
  ON public.categories
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "categories_update_admin_or_manager"
  ON public.categories
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Suppliers
CREATE POLICY "suppliers_select_management"
  ON public.suppliers
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "suppliers_insert_management"
  ON public.suppliers
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "suppliers_update_management"
  ON public.suppliers
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Products
CREATE POLICY "products_select_allowed_roles"
  ON public.products
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "products_insert_stock_management"
  ON public.products
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "products_update_stock_management"
  ON public.products
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Customers
CREATE POLICY "customers_select_allowed_roles"
  ON public.customers
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Comptable'])
  );

CREATE POLICY "customers_insert_sales_roles"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

CREATE POLICY "customers_update_sales_roles"
  ON public.customers
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

-- Purchases
CREATE POLICY "purchases_select_management"
  ON public.purchases
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "purchases_insert_management"
  ON public.purchases
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "purchases_update_management"
  ON public.purchases
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Purchase items
CREATE POLICY "purchase_items_select_management"
  ON public.purchase_items
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "purchase_items_insert_management"
  ON public.purchase_items
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "purchase_items_update_management"
  ON public.purchase_items
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Sales
CREATE POLICY "sales_select_allowed_roles"
  ON public.sales
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Comptable'])
  );

CREATE POLICY "sales_insert_cashier"
  ON public.sales
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

CREATE POLICY "sales_update_cashier"
  ON public.sales
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

-- Sale items
CREATE POLICY "sale_items_select_allowed_roles"
  ON public.sale_items
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Comptable'])
  );

CREATE POLICY "sale_items_insert_cashier"
  ON public.sale_items
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

CREATE POLICY "sale_items_update_cashier"
  ON public.sale_items
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

-- Payments
CREATE POLICY "payments_select_allowed_roles"
  ON public.payments
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Comptable'])
  );

CREATE POLICY "payments_insert_cashier"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

CREATE POLICY "payments_update_cashier"
  ON public.payments
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier'])
  );

-- Stock movements
CREATE POLICY "stock_movements_select_allowed_roles"
  ON public.stock_movements
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "stock_movements_insert_stock_role"
  ON public.stock_movements
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "stock_movements_update_stock_role"
  ON public.stock_movements
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Inventories
CREATE POLICY "inventory_select_stock_roles"
  ON public.inventory
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "inventory_insert_stock_roles"
  ON public.inventory
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "inventory_update_stock_roles"
  ON public.inventory
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Inventory items
CREATE POLICY "inventory_items_select_stock_roles"
  ON public.inventory_items
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Comptable'])
  );

CREATE POLICY "inventory_items_insert_stock_roles"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "inventory_items_update_stock_roles"
  ON public.inventory_items
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Promotions
CREATE POLICY "promotions_select_allowed_roles"
  ON public.promotions
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock','Caissier','Comptable'])
  );

CREATE POLICY "promotions_insert_manage"
  ON public.promotions
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

CREATE POLICY "promotions_update_manage"
  ON public.promotions
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Gestionnaire de stock'])
  );

-- Activity logs
CREATE POLICY "activity_logs_select_admin_or_self"
  ON public.activity_logs
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Comptable'])
    OR user_id = public.current_user_id()
  );

CREATE POLICY "activity_logs_insert_auth_users"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant','Caissier','Gestionnaire de stock','Comptable'])
    AND user_id = public.current_user_id()
  );

-- Notifications : utilisateur ne voit que ses notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = public.current_user_id()
    OR public.user_has_roles(ARRAY['Administrateur','Gérant'])
  );

CREATE POLICY "notifications_insert_admin_or_self"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
    OR user_id = public.current_user_id()
  );

CREATE POLICY "notifications_update_own_or_admin"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = public.current_user_id()
    OR public.user_has_roles(ARRAY['Administrateur','Gérant'])
  )
  WITH CHECK (
    user_id = public.current_user_id()
    OR public.user_has_roles(ARRAY['Administrateur','Gérant'])
  );

-- Settings : administration uniquement.
CREATE POLICY "settings_select_admin_or_manager"
  ON public.settings
  FOR SELECT
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
  );

CREATE POLICY "settings_update_admin_or_manager"
  ON public.settings
  FOR UPDATE
  USING (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
  )
  WITH CHECK (
    public.user_has_roles(ARRAY['Administrateur','Gérant'])
  );

-- 5) Blocage explicite par défaut : aucun accès non authentifié.
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.promotions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.settings FORCE ROW LEVEL SECURITY;

COMMIT;
