import { useEffect, useState } from "react";
import PopupHeader from "./components/PopupHeader";
import CreatePasswordPage from "./pages/CreatePasswordPage";
import TogglePage from "./pages/TogglePage";
import UnlockPage from "./pages/UnlockPage";
import AppConfigPage from "./pages/ApiConfigPage"
import { defaultSettings } from "../shared/defaultSettings";
import backTrees from "../images/backlayertrees.png";
import midTrees from "../images/midlayertrees.png";
import topTrees from "../images/toplayertrees.png";
import bears from "../images/bears.png";
import { IoInformationCircle, IoSettingsOutline } from "react-icons/io5";
import AboutPage from "./pages/AboutPage";

const SCREEN_CREATE_PIN = "create-pin";
const SCREEN_CONTROLS = "controls";
const SCREEN_UNLOCK = "unlock";
const SCREEN_ABOUT = "about";
const SCREEN_API_CONFIG = "api-config";

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  const [screen, setScreen] = useState(SCREEN_UNLOCK);
  const [parentPinExists, setParentPinExists] = useState(false);

  const [createPin, setCreatePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [unlockPin, setUnlockPin] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [statusCount, setStatusCount] = useState(0);
  const [statusFading, setStatusFading] = useState(false);

  const showStatus = (msg) => {
    setStatusFading(false);
    setStatusMessage(msg);
    setStatusCount((c) => {
      const next = c + 1;
      setTimeout(() => {
        setStatusCount((current) => {
          if (current !== next) return current;
          setStatusFading(true);
          setTimeout(() => {
            setStatusMessage("");
            setStatusFading(false);
          }, 400); // matches fadeOut duration
          return 0;
        });
      }, 1000);
      return next;
    });
  };

  const [aboutReturnScreen, setAboutReturnScreen] = useState(null);
  const [apiConfigReturnScreen, setApiConfigReturnScreen] = useState(null);

  useEffect(() => {
    chrome.storage.local.get(
      ["mamabearSettings", "parentPinHash", "parentPinSalt"],
      (result) => {
        const storedSettings = result.mamabearSettings || defaultSettings;
        const hasParentPin = Boolean(
          result.parentPinHash && result.parentPinSalt,
        );

        setSettings(storedSettings);
        setParentPinExists(hasParentPin);
        setScreen(hasParentPin ? SCREEN_UNLOCK : SCREEN_CREATE_PIN);
        setLoaded(true);
      },
    );
  }, []);

  const saveSettings = (nextSettings) => {
    setSettings(nextSettings);
    chrome.storage.local.set({ mamabearSettings: nextSettings });
  };

  const updateCategory = (key, value) => {
    const nextSettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [key]: value,
      },
    };

    saveSettings(nextSettings);
  };

  const updateRootSetting = (key, value) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    saveSettings(nextSettings);
  };

  const handleCreateParentPin = async () => {
    showStatus("");

    if (!createPin || !confirmPin) {
      showStatus("Please fill out both code fields.");
      return;
    }

    if (createPin.length < 4) {
      showStatus("Parent code must be at least 4 characters.");
      return;
    }

    if (createPin !== confirmPin) {
      showStatus("Codes do not match.");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SET_PARENT_PIN",
        pin: createPin,
      });

      if (!response?.ok) {
        showStatus("Unable to save parent code.");
        return;
      }

      setParentPinExists(true);
      setCreatePin("");
      setConfirmPin("");
      showStatus("Parent code created.");
      setUnlockPin("");
      setScreen(SCREEN_UNLOCK);
    } catch (error) {
      showStatus("Something went wrong while creating the code.");
    }
  };

  const handleUnlock = async () => {
    if (!unlockPin) {
      showStatus("Please enter the parent code."); 
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({
        type: "VERIFY_PARENT_PIN",
        pin: unlockPin,
      });
      if (!response?.ok || !response?.valid) {
        showStatus("Incorrect parent code.");
        return;
      }
      setUnlockPin("");
      showStatus("Parent code accepted.");  
      setScreen(SCREEN_CONTROLS);
    } catch (error) {
      showStatus("Could not verify the parent code."); // was setStatusMessage
    }
  };

  const handleLockControls = () => {
    chrome.runtime.sendMessage({ type: "LOCK_PARENT_CONTROLS" });
    setUnlockPin("");
    showStatus("Settings saved.");
    setScreen(parentPinExists ? SCREEN_UNLOCK : SCREEN_CREATE_PIN);
  };

  const handleHelp = () => {
    showStatus("Help: turn categories on or off, then save with the parent code.");
  };
  
  const handleSettings = () => {
    showStatus("Settings: choose strictness and response mode here.");
  };

  const handleAbout = () => {
    if (screen !== SCREEN_ABOUT) {
      setAboutReturnScreen(screen);
    }
    setScreen(SCREEN_ABOUT);
  };

  const handleApiConfig = () => {
    if (screen !== SCREEN_API_CONFIG) {
      setApiConfigReturnScreen(screen);
    }
    setScreen(SCREEN_API_CONFIG);
  };

  const showBackground = screen !== SCREEN_CONTROLS;

  if (!loaded) {
    return <div className="popup-shell">Loading...</div>;
  }


  return (
    <div className="popup-shell">
      <link
        href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      {showBackground && (
        <div className="popup-background" aria-hidden="true">
          <img
            className="popup-layer popup-layer-back"
            src={backTrees}
            alt=""
          />
          <img className="popup-layer popup-layer-mid" src={midTrees} alt="" />
          <img className="popup-layer popup-layer-top" src={topTrees} alt="" />
          <img className="popup-layer popup-layer-bears" src={bears} alt="" />
        </div>
      )}

      <div className="popup-content">
        <PopupHeader
          showIcons={screen === SCREEN_CONTROLS}
          onHelp={handleHelp}
          onSettings={handleSettings}
          onAbout={handleAbout}
        />

        {screen === SCREEN_CREATE_PIN && (
          <CreatePasswordPage
            createPin={createPin}
            confirmPin={confirmPin}
            onCreatePinChange={setCreatePin}
            onConfirmPinChange={setConfirmPin}
            onSave={handleCreateParentPin}
          />
        )}

        {screen === SCREEN_CONTROLS && (
          <TogglePage
            settings={settings}
            onRootSettingChange={updateRootSetting}
            onCategoryChange={updateCategory}
            onSaveAndLock={handleLockControls}
          />
        )}

        {screen === SCREEN_UNLOCK && (
          <UnlockPage
            unlockPin={unlockPin}
            onUnlockPinChange={setUnlockPin}
            onUnlock={handleUnlock}
          />
        )}

        {screen === SCREEN_API_CONFIG && (
          <AppConfigPage
            onBack={() =>
              setScreen(apiConfigReturnScreen || SCREEN_CONTROLS)
            }
          />
        )}

        {screen === SCREEN_ABOUT && (
          <AboutPage onBack={() => setScreen(aboutReturnScreen || SCREEN_CONTROLS)} />
        )}

        {statusMessage && (
        <div className={`status-banner${statusFading ? " fading" : ""}`} key={statusCount}>
          {statusMessage}
        </div>
      )}

        <div className="floating-button-row">
          {screen === SCREEN_CONTROLS && (
            <button
              className="floating-action-button"
              onClick={handleApiConfig}
              aria-label="Settings"
            >
              <IoSettingsOutline size={20} />
            </button>
          )}

          <button
            className="floating-action-button floating-about-button"
            onClick={handleAbout}
            aria-label="About MamaBear"
          >
            <IoInformationCircle size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
