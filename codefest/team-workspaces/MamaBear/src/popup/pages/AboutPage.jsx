import SectionCard from "../components/SectionCard";
import { IoArrowBack } from "react-icons/io5";

export default function AboutPage({ onBack }) {
    return (
        <div>
            <SectionCard title="About MamaBear">
              <p className="status-text">
                MamaBear Web Shield helps monitor and filter harmful search content. 
              </p>
              <p className="status-text">
              MamaBear Web Shield uses the power of AI to block any harmful posts having to do with parent-selected categories. The categories include things like profanity, sexual content, substance abuse, etc.
              </p>
              <p className="status-text">
              The main goal of MamaBear Web Shield is to protect young girls from the prevalence of eating-disorder (ED) related content perpetuated by social media accounts (with rates of EDs doubling 20 years after the advent of the internet). 
              </p>
              <p className="status-text">
              MamaBear is there to protect young minds from the bad parts of the internet, so that you can focus on the good. 
              </p>
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