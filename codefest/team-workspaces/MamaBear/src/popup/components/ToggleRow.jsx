import ToggleSwitch from "./ToggleSwitch"

export default function ToggleRow({ label, checked, onChange }) {
  const id = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <div className="toggle-row">
      <span>{label}</span>
      <ToggleSwitch
        id={id}
        checked={checked}
        onChange={onChange}
      />
    </div>
  )
}