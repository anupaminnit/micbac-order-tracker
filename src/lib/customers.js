import { supabase } from './supabase'

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('id, name').order('name')
  if (error) throw error
  return data
}

export async function addCustomer(name) {
  const { error } = await supabase.from('customers').insert({ name })
  // 23505 = unique violation: someone added the same name (any casing) meanwhile — that's fine.
  if (error && error.code !== '23505') throw error
}

// Collapses whitespace so pasted names with stray/double spaces match existing entries.
export function normalizeCustomerName(name) {
  return name.trim().replace(/\s+/g, ' ')
}
