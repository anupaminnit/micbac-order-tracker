-- The 135/125 cm jumbo images were replaced in place, but storage serves them with
-- max-age=3600, so devices kept showing the old artwork. New file names force a fresh fetch.
UPDATE public.branding_options
  SET image_path = 'pictures/Unbranded Jumbo 105x105x135 v2.jpeg'
  WHERE label = 'Without branding 135 cm 105 x 105 x 135 cm jumbo bag';
UPDATE public.branding_options
  SET image_path = 'pictures/Unbranded Jumbo 105x105x125 v2.jpeg'
  WHERE label = 'Without branding 125 cm 105 x 105 x 125 cm jumbo bag';
