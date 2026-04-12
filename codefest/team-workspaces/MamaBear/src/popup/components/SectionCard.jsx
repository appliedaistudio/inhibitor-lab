export default function SectionCard({ title, children }) {
  return (
    <section className="section-card">
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  )
}