import { useEffect, useState } from 'react'
import { getBrandingOptions, brandingImageUrl } from '../lib/branding'

export function useBrandingOptions() {
  const [options, setOptions] = useState([])

  useEffect(() => {
    getBrandingOptions()
      .then(setOptions)
      .catch((err) => console.error('Failed to load branding options:', err))
  }, [])

  const byLabel = Object.fromEntries(options.map((o) => [o.label, o]))
  return { options, byLabel, imageUrl: brandingImageUrl }
}
