import SectionCard from "../components/SectionCard";

export default function CreatePasswordPage({
  createPin,
  confirmPin,
  onCreatePinChange,
  onConfirmPinChange,
  onSave,
}) {
  return (
    <>
      <SectionCard title="Create Parent Code">
        <div className="field-group">
          <label className="field-label" htmlFor="createPin">
            Create Parent Code
          </label>
          <input
            id="createPin"
            type="password"
            value={createPin}
            onChange={(event) => onCreatePinChange(event.target.value)}
            placeholder="Enter parent code"
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="confirmPin">
            Confirm Parent Code
          </label>
          <input
            id="confirmPin"
            type="password"
            value={confirmPin}
            onChange={(event) => onConfirmPinChange(event.target.value)}
            placeholder="Re-enter parent code"
          />
        </div>

        <button className="primary-button" type="button" onClick={onSave}>
          Save Parent Code
        </button>
      </SectionCard>

      <SectionCard title="Welcome">
        <p className="status-text">
          Create a parent code before using MamaBear controls.
        </p>
      </SectionCard>
    </>
  );
}
