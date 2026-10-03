import { useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { normalizeCustomerName } from '../lib/customers'
import '../styles/CustomerCombobox.css'

// Replaces a native <datalist>: iOS Safari renders those as a strip above the keyboard rather
// than a dropdown under the field. Free text is still allowed — a name not in `options` is
// offered as "Add …" and the parent persists it.
export default function CustomerCombobox({ id, value, options, onChange, required }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listRef = useRef(null)

  const typed = normalizeCustomerName(value)
  const query = typed.toLowerCase()
  const matches = query ? options.filter((name) => name.toLowerCase().includes(query)) : options
  const exact = options.some((name) => name.toLowerCase() === query)
  const showAdd = query && !exact
  // Rows: matches first, then the optional "Add" row — index math below relies on this order.
  const rowCount = matches.length + (showAdd ? 1 : 0)

  const choose = (name) => {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  const scrollIntoView = (index) => {
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      if (rowCount === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      const next = (active + step + rowCount) % rowCount
      setActive(next)
      scrollIntoView(next)
    } else if (e.key === 'Enter' && open && active >= 0) {
      // Only intercept when a row is highlighted; otherwise Enter submits the form as usual.
      e.preventDefault()
      choose(active < matches.length ? matches[active] : typed)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="combobox">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        required={required}
        placeholder="Pick from list or type a new one"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        // Rows use onMouseDown+preventDefault, so focus never leaves the input on a row tap —
        // blur only fires when the user genuinely moves elsewhere.
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="combobox-toggle"
        tabIndex={-1}
        aria-label="Show customers"
        onMouseDown={(e) => {
          e.preventDefault()
          document.getElementById(id)?.focus()
          setOpen((o) => !o)
        }}
      >
        <ChevronDown size={16} />
      </button>

      {open && rowCount > 0 && (
        <ul className="combobox-list" id={`${id}-listbox`} role="listbox" ref={listRef}>
          {matches.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === active}
              className={`combobox-option ${i === active ? 'combobox-option-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(name)
              }}
            >
              {name}
            </li>
          ))}
          {showAdd && (
            <li
              role="option"
              aria-selected={active === matches.length}
              className={`combobox-option combobox-option-add ${active === matches.length ? 'combobox-option-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(typed)
              }}
            >
              <Plus size={14} />
              Add “{typed}” as new customer
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
