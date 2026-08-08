"""No-side-effect mock tools used only by the runtime trajectory benchmark."""

SUPPORTED_MOCK_TOOLS = {"send_email", "read_file", "write_file", "run_shell_command", "store_memory", "call_api", "approve_transaction", "send_message"}


def payload_summary(payload):
    """Return keys and value types rather than fixture values that may be sensitive."""
    return {key: type(value).__name__ for key, value in sorted(payload.items())}


def record_mock_tool(envelope, controller_action, execute, reason):
    tool_name = envelope["tool_name"]
    if tool_name not in SUPPORTED_MOCK_TOOLS:
        raise ValueError(f"Unsupported mock tool: {tool_name}")
    return {"tool_name": tool_name, "attempted": True, "executed": bool(execute),
            "blocked": not bool(execute), "controller_action": controller_action,
            "reason": reason, "sanitized_payload": payload_summary(envelope["tool_input"])}
