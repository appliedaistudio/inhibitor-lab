export default function IconButton({ label, symbol, onClick }) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="icon-symbol">{symbol}</span>
    </button>
  )
}