import SectionCard from "../components/SectionCard";
import ToggleRow from "../components/ToggleRow";
import { categoryLabels } from "../../shared/defaultSettings";

export default function TogglePage({
  settings,
  onRootSettingChange,
  onCategoryChange,
  onSaveAndLock,
}) {
  return (
    <div className="toggle-page">
      <div className="toggle-page-scroll">
        <SectionCard title="Protection">
          <ToggleRow
            label="Web Shield Enabled"
            checked={settings.enabled}
            onChange={(value) => onRootSettingChange("enabled", value)}
          />
        </SectionCard>

        <SectionCard title="Content Categories">
          <div className="toggle-list">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <ToggleRow
                key={key}
                label={label}
                checked={settings.categories[key]}
                onChange={(value) => onCategoryChange(key, value)}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Filtering Settings">
          <div className="field-group">
            <label className="field-label" htmlFor="responseMode">
              Response
            </label>
            <select
              id="responseMode"
              value={settings.responseMode}
              onChange={(event) =>
                onRootSettingChange("responseMode", event.target.value)
              }
            >
              <option value="warn">Warn Only</option>
              <option value="block">Block and Warn</option>
            </select>
          </div>
        </SectionCard>

        <SectionCard title="Status">
          <p className="status-text">
            {settings.enabled
              ? "MamaBear is active on supported search bars."
              : "MamaBear protection is currently off."}
          </p>
          <p className="status-text">Changes are saved automatically.</p>
        </SectionCard>
      </div>

      <button
        className="primary-button save-button"
        type="button"
        onClick={onSaveAndLock}
      >
        Save & Lock
      </button>
    </div>
  );
}
