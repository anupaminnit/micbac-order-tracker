-- Replaces the plain Unbranded/Branded/Custom dropdown with an image-backed picker of the
-- actual branding designs MICBAC uses. image_path is a path within the pre-existing
-- packaging-images storage bucket (public, found already set up from an earlier, unrelated
-- effort — see PROGRESS.md). No app-facing write policy: rows are seeded here and via any
-- future migration, not created through the app UI.
CREATE TABLE public.branding_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  image_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branding_options ENABLE ROW LEVEL SECURITY;

-- Readable by anon too — Factory (no login) needs to show the selected branding's image/label.
CREATE POLICY "branding_options_select_all" ON public.branding_options
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.branding_options (label, image_path, sort_order) VALUES
  ('Default', 'pictures/Default.jpeg', 0),
  ('Biege', 'pictures/Biege.jpeg', 1),
  ('Borneo', 'pictures/Borneo.jpeg', 2),
  ('Carbon plus', 'pictures/Carbon plus.jpeg', 3),
  ('CK Orange', 'pictures/CK Orange.jpeg', 4),
  ('CK_Blue', 'pictures/CK_Blue.jpeg', 5),
  ('CK_Red', 'pictures/CK_Red.jpeg', 6),
  ('Karbonz', 'pictures/Karbonz.jpeg', 7),
  ('Koreway', 'pictures/Koreway.jpeg', 8),
  ('Made in India Black', 'pictures/Made in India Black.jpeg', 9),
  ('Micoco gold', 'pictures/Micoco gold.jpeg', 10),
  ('True Carb', 'pictures/True Carb.jpeg', 11),
  ('Water master', 'pictures/Water master.jpeg', 12);
