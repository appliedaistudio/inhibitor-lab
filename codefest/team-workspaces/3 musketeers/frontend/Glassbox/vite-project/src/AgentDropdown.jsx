import CreateDropdown from "./CreateDropdown"
import { useState, useEffect } from "react";

const AgentDropdown = (props) => {
    const [agent, setAgent] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3001/api/agents/${props.id}`)
            .then(res => res.json())
            .then(data => setAgent(data));
    }, [props.id]);

    if (!agent) return <div>Loading...</div>;

    const severities = [
        { heading: `High Severity (${agent.high.count})`, body: agent.high.events},
        { heading: `Medium Severity (${agent.medium.count})`, body: agent.medium.events},
        { heading: `Low Severity (${agent.low.count})`, body: agent.low.events},
    ];

    return (
        <div className="section">
            <h1>{props.name}</h1>
            {severities.map((s) => (
                <CreateDropdown key={s.heading} sections={s} />
            ))}
        </div>
    )
}

export default AgentDropdown;