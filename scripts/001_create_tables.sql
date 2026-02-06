-- Ingredients table
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_qty NUMERIC NOT NULL DEFAULT 0,
  buy_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients_public_select" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_public_insert" ON public.ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "ingredients_public_update" ON public.ingredients FOR UPDATE USING (true);
CREATE POLICY "ingredients_public_delete" ON public.ingredients FOR DELETE USING (true);

-- Menus table
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_s NUMERIC NOT NULL DEFAULT 0,
  price_m NUMERIC NOT NULL DEFAULT 0,
  price_l NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menus_public_select" ON public.menus FOR SELECT USING (true);
CREATE POLICY "menus_public_insert" ON public.menus FOR INSERT WITH CHECK (true);
CREATE POLICY "menus_public_update" ON public.menus FOR UPDATE USING (true);
CREATE POLICY "menus_public_delete" ON public.menus FOR DELETE USING (true);

-- Recipes table (links menus to ingredients with qty per size)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L')),
  ingredient_name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_public_select" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "recipes_public_insert" ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "recipes_public_update" ON public.recipes FOR UPDATE USING (true);
CREATE POLICY "recipes_public_delete" ON public.recipes FOR DELETE USING (true);

-- Options table
CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'check',
  price_delta NUMERIC NOT NULL DEFAULT 0,
  cost_delta NUMERIC NOT NULL DEFAULT 0,
  max_qty INTEGER NOT NULL DEFAULT 4,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "options_public_select" ON public.options FOR SELECT USING (true);
CREATE POLICY "options_public_insert" ON public.options FOR INSERT WITH CHECK (true);
CREATE POLICY "options_public_update" ON public.options FOR UPDATE USING (true);
CREATE POLICY "options_public_delete" ON public.options FOR DELETE USING (true);

-- Platforms table
CREATE TABLE IF NOT EXISTS public.platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform_fee_rate NUMERIC NOT NULL DEFAULT 0,
  card_fee_rate NUMERIC NOT NULL DEFAULT 0.03,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platforms_public_select" ON public.platforms FOR SELECT USING (true);
CREATE POLICY "platforms_public_insert" ON public.platforms FOR INSERT WITH CHECK (true);
CREATE POLICY "platforms_public_update" ON public.platforms FOR UPDATE USING (true);
CREATE POLICY "platforms_public_delete" ON public.platforms FOR DELETE USING (true);

-- Insert default platforms
INSERT INTO public.platforms (id, name, platform_fee_rate, card_fee_rate, delivery_fee) VALUES
  ('BAEMIN_DELIVERY', '배민', 0.0787, 0.03, 3400),
  ('BAEMIN_STORE', '배민 가게배달', 0.0748, 0.03, 3400),
  ('BAEMIN_PICKUP', '배민 포장', 0.0748, 0.03, 0),
  ('YOGIYO_DELIVERY', '요기요', 0.0737, 0.03, 3190),
  ('YOGIYO_STORE', '요기요 가게배달', 0.1067, 0.03, 3190),
  ('YOGIYO_PICKUP', '요기요 포장', 0.0847, 0.03, 0),
  ('COUPANG_DELIVERY', '쿠팡이츠', 0.0858, 0.03, 3730),
  ('COUPANG_PICKUP', '쿠팡 포장', 0.0858, 0.03, 0)
ON CONFLICT (id) DO NOTHING;
