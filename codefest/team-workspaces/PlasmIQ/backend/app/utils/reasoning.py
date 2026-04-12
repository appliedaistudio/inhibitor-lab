import logging
from app.config import settings

logger = logging.getLogger(__name__)

# OpenAI client is initialized lazily to avoid crash on invalid key at startup
_openai_client = None


def _get_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


class SchedulingReasoner:
    """AI reasoning engine for scheduling decisions."""
    
    def __init__(self, model: str = settings.openai_model):
        self.model = model
    
    def rank_appointment_slots(
        self,
        donor_profile: dict,
        available_slots: list[dict],
        context_signals: dict
    ) -> list[dict]:
        """
        Use AI to rank appointment slots based on donor patterns and context.
        
        Args:
            donor_profile: Donor's historical data and preferences
            available_slots: List of available time slots
            context_signals: Weather, traffic, crowding data
        
        Returns:
            Top 3 ranked slots with reasoning
        """
        prompt = f"""
You are a scheduling assistant for plasma donation centers. Analyze the donor profile, 
available slots, and context signals to recommend the top 3 best appointment times.

DONOR PROFILE:
- Name: {donor_profile.get('name')}
- Preferred time: {donor_profile.get('preferred_time')}
- No-show rate: {donor_profile.get('no_show_rate', 0):.1%}
- Recent donation patterns: {donor_profile.get('recent_patterns')}

AVAILABLE SLOTS:
{self._format_slots(available_slots)}

CONTEXT SIGNALS:
- Weather: {context_signals.get('weather')}
- Traffic conditions: {context_signals.get('traffic')}
- Center crowding: {context_signals.get('crowding')}
- Time since last donation: {context_signals.get('days_since_last')} days

Please rank the slots considering:
1. Donor's preferred time of day and patterns
2. Traffic and weather impact on show-up probability
3. Center crowding levels
4. Available incentives

Return a JSON response with top 3 slots in this format:
{{
    "ranked_slots": [
        {{"slot_id": "...", "rank": 1, "score": 0.95, "reasoning": "..."}},
        ...
    ]
}}
"""
        try:
            response = _get_client().chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert scheduling AI for healthcare appointments."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            logger.info(f"Slot ranking response: {content}")
            return self._parse_ranked_slots(content)
        
        except Exception as e:
            logger.error(f"Slot ranking failed: {e}")
            return []
    
    def generate_personalized_message(
        self,
        donor: dict,
        slots: list[dict],
        incentive: dict
    ) -> str:
        """
        Generate personalized engagement message for donor.
        
        Args:
            donor: Donor profile
            slots: Top ranked appointment slots
            incentive: Available incentive/offer
        
        Returns:
            Personalized message
        """
        prompt = f"""
Create a brief, personalized message to encourage a plasma donor to book an appointment.

DONOR:
- Name: {donor.get('name')}
- Preferred time: {donor.get('preferred_time')}
- Last donation: {donor.get('last_donation')} days ago

RECOMMENDED SLOTS:
{self._format_slots(slots[:3])}

INCENTIVE:
- Offer: {incentive.get('description')}
- Value: {incentive.get('value')}

Guidelines:
- Keep it brief (1-2 sentences)
- Be encouraging but not pushy
- Mention the best time slot and incentive
- Use the donor's name

Return ONLY the message, no JSON."""
        
        try:
            response = _get_client().chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a friendly healthcare communication specialist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            message = response.choices[0].message.content
            logger.info(f"Generated message: {message}")
            return message
        
        except Exception as e:
            logger.error(f"Message generation failed: {e}")
            return "We have availability at times that work for you. Book now!"
    
    def analyze_reschedule_request(
        self,
        appointment: dict,
        reason: str,
        donor_profile: dict
    ) -> dict:
        """
        Analyze a reschedule request and suggest alternative slots.
        
        Args:
            appointment: Current appointment details
            reason: Reason for rescheduling (missed, traffic, etc.)
            donor_profile: Donor's profile
        
        Returns:
            Analysis with suggested alternatives
        """
        prompt = f"""
A plasma donor needs to reschedule their appointment.

ORIGINAL APPOINTMENT:
- Time: {appointment.get('scheduled_time')}
- Center: {appointment.get('center_name')}

REASON: {reason}

DONOR PROFILE:
- Preferred times: {donor_profile.get('preferred_time')}
- Show-up rate: {donor_profile.get('no_show_rate', 0):.1%}

Analyze this situation and suggest:
1. Why this happened (pattern analysis)
2. Best new time slots to offer
3. Suggested incentive adjustment

Return JSON:
{{
    "analysis": "...",
    "suggested_slots": ["..."],
    "recommended_incentive_boost": "..."
}}"""
        
        try:
            response = _get_client().chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert in donor retention and scheduling optimization."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            logger.info(f"Reschedule analysis: {content}")
            return self._parse_json_response(content)
        
        except Exception as e:
            logger.error(f"Reschedule analysis failed: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def _format_slots(slots: list[dict]) -> str:
        """Format slots for prompt."""
        return "\n".join([f"- {s.get('time')}: {s.get('center')} (crowding: {s.get('crowding', 'unknown')})" for s in slots])
    
    @staticmethod
    def _parse_ranked_slots(response: str) -> list[dict]:
        """Parse ranked slots from response. Internal reasoning is stripped before any client use."""
        try:
            import json
            data = json.loads(response)
            slots = data.get("ranked_slots", [])
            for s in slots:
                s.pop("reasoning", None)
                s.pop("chain_of_thought", None)
            return slots
        except Exception:
            return []
    
    @staticmethod
    def _parse_json_response(response: str) -> dict:
        """Parse JSON from response."""
        try:
            import json
            return json.loads(response)
        except:
            return {}


# Initialize reasoning engine
reasoning_engine = SchedulingReasoner()
