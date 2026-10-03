import { useState } from 'react'
import { ZoomIn, X } from 'lucide-react'
import { useBrandingOptions } from '../hooks/useBrandingOptions'
import '../styles/Branding.css'

// Larger, higher-contrast variant of BrandingBadge for the Factory floor screen — workers need
// to clearly see which bag design to use, not just read its name in small print. Tapping the
// thumbnail opens it full-screen since even the larger inline thumbnail is too small to read
// label details against a physical bag.
export default function BrandingShowcase({ label }) {
  const { byLabel, imageUrl } = useBrandingOptions()
  const option = byLabel[label]
  const [zoomed, setZoomed] = useState(false)

  if (!option) {
    return <span className="branding-showcase-text">{label}</span>
  }

  const url = imageUrl(option.image_path)

  return (
    <>
      <button type="button" className="branding-showcase" onClick={() => setZoomed(true)}>
        <span className="branding-showcase-thumb">
          <img src={url} alt={option.label} className="branding-showcase-img" />
          <span className="branding-showcase-zoom-hint">
            <ZoomIn size={18} />
          </span>
        </span>
        <span className="branding-showcase-label">{option.label}</span>
      </button>

      {zoomed && (
        <div className="branding-lightbox" onClick={() => setZoomed(false)}>
          <button className="branding-lightbox-close" onClick={() => setZoomed(false)} aria-label="Close">
            <X size={22} />
          </button>
          <img src={url} alt={option.label} className="branding-lightbox-img" />
          <span className="branding-lightbox-label">{option.label}</span>
        </div>
      )}
    </>
  )
}
