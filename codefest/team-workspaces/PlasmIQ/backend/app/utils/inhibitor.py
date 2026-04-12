import json
import logging
from typing import Optional, Dict, Any
import requests
from app.config import settings

logger = logging.getLogger(__name__)


class InhibitorAPI:
    """Wrapper for Inhibitor API - ethical evaluation service."""
    
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.check_url = f"{self.base_url}/check"
        self.health_url = self.base_url
    
    def health_check(self) -> bool:
        """Check if Inhibitor API is accessible."""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            # Try different health check endpoints
            endpoints = [
                f"{self.base_url}/health",
                f"{self.base_url}/status",
                self.base_url
            ]
            
            for endpoint in endpoints:
                try:
                    response = requests.get(endpoint, headers=headers, timeout=3)
                    if response.status_code in [200, 401, 403]:  # 401/403 means API is up but auth may fail
                        logger.info(f"✓ Inhibitor API reachable at {endpoint}")
                        return True
                except:
                    continue
            
            logger.warning(f"⚠ Inhibitor API not reachable at {self.base_url}")
            return False
        except Exception as e:
            logger.error(f"Inhibitor health check failed: {e}")
            return False
    
    def evaluate_thought_chain(
        self,
        thought_chain: list[dict],
        mode: str = "insight"
    ) -> Dict[str, Any]:
        """
        Evaluate a thought chain for ethical risks.

        Args:
            thought_chain: List of conversation turns with 'role' and 'content'
            mode: "insight" for detailed explanation or "performance" for fast feedback

        Returns:
            Evaluation result with risk assessment
        """
        if not self.api_key:
            return {"skipped": "no_api_key"}
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "thought_chain": thought_chain,
                "mode": mode
            }
            
            response = requests.post(
                self.check_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.debug(f"Inhibitor API error: {response.status_code} - {response.text}")
                return {"error": response.text, "status_code": response.status_code}
        
        except Exception as e:
            logger.error(f"Inhibitor evaluation failed: {e}")
            return {"error": str(e)}
    
    def validate_donor_message(self, donor_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a message to be sent to a donor for ethical concerns.
        
        Args:
            donor_message: The message to send to donor
            context: Context about the donor/appointment
        
        Returns:
            Validation result with risk assessment
        """
        thought_chain = [
            {
                "role": "system",
                "content": "You are evaluating a message to be sent to a plasma donor. Ensure it's ethical, respectful, and not coercive."
            },
            {
                "role": "user",
                "content": f"Donor context: {json.dumps(context)}\n\nMessage to send: {donor_message}"
            }
        ]
        
        return self.evaluate_thought_chain(thought_chain, mode="insight")


# Initialize Inhibitor API
inhibitor = InhibitorAPI(
    api_key=settings.inhibitor_api_key or "",
    base_url=settings.inhibitor_base_url,
)