from twilio.twiml.messaging_response import MessagingResponse


def build_twiml_reply(text: str) -> str:
    """Wrap an agent response in TwiML for Twilio to send via SMS.

    Twilio SMS has a 1600-char segment limit. Messages longer than that get
    auto-split, but we trim heavy footers to keep the first segment readable.
    """
    resp = MessagingResponse()
    body = text.strip()
    if len(body) > 1500:
        body = body[:1500] + "… (text HELP for full answer)"
    resp.message(body)
    return str(resp)
