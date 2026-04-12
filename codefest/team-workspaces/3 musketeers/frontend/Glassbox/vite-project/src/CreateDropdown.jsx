//Props -> sections (dictionary)
//sections -> {heading: text, body: text}

import { useState } from "react";

const CreateDropdown = (props) => {
   const { heading, body } = props.sections;
    const [isActive, setActive] = useState(false)

    return (
        <>
            <button className={isActive ? "open" : "question"}
                    onClick={() => setActive(!isActive)}>
                {heading}
            </button>
            {isActive && <div className="answer">
                {body.length === 0 ? (
                    <p>No events.</p>
                ) : (
                    body.map((event, i) => (
                        <pre key={i}>{JSON.stringify(event, null, 2)}</pre>
                    ))
                )}
            </div>}
        </>
    )
}

export default CreateDropdown;