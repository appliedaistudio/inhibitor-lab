import { useEffect, useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import SectionCard from "../components/SectionCard";

type ApiConfigPageProps = {
  onBack: () => void;
};

export default function ApiConfigPage({ onBack }: ApiConfigPageProps) {
  const [inhibitorKey, setInhibitorKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      ["apiKey", "openAiKey", "geminiKey"],
      ({
        apiKey,
        openAiKey,
        geminiKey,
      }: {
        apiKey?: string;
        openAiKey?: string;
        geminiKey?: string;
      }) => {
        if (apiKey) {
          setInhibitorKey(apiKey);
        }

        if (openAiKey) {
          setOpenAiKey(openAiKey);
        }

        if (geminiKey) {
          setGeminiKey(geminiKey);
        }
      },
    );
  }, []);

  const handleSave = async () => {
    await chrome.storage.local.set({
      apiKey: inhibitorKey,
      openAiKey,
      geminiKey,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="api-config-page">
      <SectionCard title="API Settings">
        <div className="field-group">
          <label className="field-label" htmlFor="inhibitorKey">
            appliedAIstudio API Key (optional)
          </label>
          <input
            id="inhibitorKey"
            type="password"
            value={inhibitorKey}
            onChange={(event) => setInhibitorKey(event.target.value)}
            placeholder="Paste your appliedAIstudio API key here"
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="openAiKey">
            OpenAI API Key (optional)
          </label>
          <input
            id="openAiKey"
            type="password"
            value={openAiKey}
            onChange={(event) => setOpenAiKey(event.target.value)}
            placeholder="Paste your OpenAI API key here"
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="geminiKey">
            Gemini API Key (optional)
          </label>
          <input
            id="geminiKey"
            type="password"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
            placeholder="Paste your Gemini API key here"
          />
        </div>

        <button className="primary-button" type="button" onClick={handleSave}>
          Save Keys
        </button>

        {saved && <p className="status-text api-config-saved">Saved.</p>}
      </SectionCard>

      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
        <IoArrowBack />
        Go back
      </button>
    </div>
  );
}
