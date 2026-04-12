export default function ToggleSwitch({ checked, onChange, id }) {
    return (
      <label className="switch">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="slider"></span>
      </label>
    )
  }