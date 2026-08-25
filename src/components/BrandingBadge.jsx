import { useBrandingOptions } from '../hooks/useBrandingOptions'
import '../styles/Branding.css'

export default function BrandingBadge({ label }) {
  const { byLabel, imageUrl } = useBrandingOptions()
  const option = byLabel[label]

  if (!option) {
    return <span className="branding-badge-text">{label}</span>
  }

  return (
    <span className="branding-badge">
      <img src={imageUrl(option.image_path)} alt={option.label} className="branding-badge-img" />
      {option.label}
    </span>
  )
}
