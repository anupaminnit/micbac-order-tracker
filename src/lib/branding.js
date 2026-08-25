import { supabase } from './supabase'

export async function getBrandingOptions() {
  const { data, error } = await supabase.from('branding_options').select('*').order('sort_order')
  if (error) throw error
  return data
}

export function brandingImageUrl(imagePath) {
  return supabase.storage.from('packaging-images').getPublicUrl(imagePath).data.publicUrl
}
