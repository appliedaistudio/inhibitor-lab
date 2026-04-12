import IconButton from "./IconButton";
import logo from "../../images/logo.png";

export default function PopupHeader({
  showIcons = false,
  onHelp,
  onSettings,
  onAbout,
}) {
  return (
    <header className="popup-header">
      <div className="popup-header-left">
        <div className="brand-mark">
          <img src={logo} alt="MamaBear logo" />
        </div>

        <div>
          <h1 className="popup-title">MamaBear Web Shield</h1>
          <p className="popup-subtitle">
            Shield your cubs from the internet forest
          </p>
        </div>
      </div>
    </header>
  );
}
