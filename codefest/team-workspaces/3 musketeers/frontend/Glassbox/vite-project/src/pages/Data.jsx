import React from 'react'
import AgentDropdown from '../AgentDropdown'


const Data = () => {
    return (
        <div className='min-h-screen bg-primary' grid place-items-center>
        <AgentDropdown name={"finance-agent-alpha"} id={"finance-agent-alpha"}/>
        <AgentDropdown name={"privacy-agent-beta"} id={"privacy-agent-beta"}/>
        <AgentDropdown name={"ops-agent-gamma"} id={"ops-agent-gamma"}/>
        </div>
    )
}

export default Data;