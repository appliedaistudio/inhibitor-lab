import SectionCard from "../components/SectionCard";

export default function UnlockPage({
  unlockPin,
  onUnlockPinChange,
  onUnlock,
}) {
  return (
    <>
      <SectionCard title="Enter Parent Code">
        <div className="field-group">
          <label className="field-label" htmlFor="unlockPin">
            Parent Code
          </label>
          <input
            id="unlockPin"
            type="password"
            value={unlockPin}
            onChange={(event) => onUnlockPinChange(event.target.value)}
            placeholder="Enter parent code"
          />
        </div>

        <div className="button-row">
          <button className="primary-button" type="button" onClick={onUnlock}>
            Unlock
          </button>
        </div>
      </SectionCard>

      <div className="security-text">
        <SectionCard title="Security">
          <p className="status-text">
            Enter the parent code to approve and save changes.
          </p>
        </SectionCard>
      </div>

      
    </>
  );
}
