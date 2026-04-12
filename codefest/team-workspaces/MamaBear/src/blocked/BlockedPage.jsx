import logo from "../images/logo.png";

function readQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

export default function BlockedPage() {
  const blockedQuery = readQueryParam("query");
  const sourceUrl = readQueryParam("source");
  const reason = readQueryParam("reason");
  const reviewSource = readQueryParam("review");
  const reviewLabel =
    reviewSource === "regex"
      ? "Regex rules"
      : reviewSource
        ? "AI review"
        : "";

  return (
    <main className="blocked-shell">
      <section className="blocked-card">
        <img className="blocked-logo" src={logo} alt="MamaBear logo" />
        <p className="blocked-kicker">MamaBear Web Shield</p>
        <h1 className="blocked-title">Search Blocked</h1>
        <p className="blocked-copy">
          MamaBear intercepted this search before the results page could load.
        </p>
        {blockedQuery && <p className="blocked-query">{blockedQuery}</p>}
        {reason && (
          <div className="blocked-reason-card">
            <p className="blocked-reason-label">Reason</p>
            <p className="blocked-reason">{reason}</p>
          </div>
        )}
        {reviewLabel && (
          <p className="blocked-meta">
            Flagged by: <span>{reviewLabel}</span>
          </p>
        )}
        {sourceUrl && (
          <p className="blocked-meta">
            Source: <span>{sourceUrl}</span>
          </p>
        )}
      </section>
    </main>
  );
}
