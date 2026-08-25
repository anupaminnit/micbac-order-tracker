import { useBrandingOptions } from '../hooks/useBrandingOptions'
import '../styles/Branding.css'

export default function BrandingPicker({ value, onChange }) {
  const { options, imageUrl } = useBrandingOptions()

  return (
    <div className="branding-picker">
      <div className="branding-carousel">
        {options.map((opt) => (
          <button
            type="button"
            key={opt.id}
            className={`branding-card ${value === opt.label ? 'branding-card-selected' : ''}`}
            onClick={() => onChange(opt.label)}
          >
            <img src={imageUrl(opt.image_path)} alt={opt.label} className="branding-card-img" />
            <span className="branding-card-label">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
