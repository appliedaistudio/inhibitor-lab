import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional
from zoneinfo import ZoneInfo

# All PlasmIQ centers are in Philadelphia — use Eastern time for scheduling
EASTERN = ZoneInfo("America/New_York")

logger = logging.getLogger(__name__)


def _as_utc(dt: datetime) -> datetime:
    """Ensure a datetime is UTC-aware; treats naive datetimes as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class AppointmentValidator:
    """Validates appointment constraints and rules."""
    
    def __init__(self, max_per_week: int = 2, rest_days: int = 1):
        self.max_per_week = max_per_week
        self.rest_days = rest_days
    
    async def validate_appointment_slot(
        self,
        donor_id: str,
        proposed_time: datetime,
        db,
        reason: str = "check_availability"
    ) -> Tuple[bool, str]:
        """
        Validate if a proposed appointment time is valid for a donor.
        
        Args:
            donor_id: ID of donor
            proposed_time: Proposed appointment datetime
            db: MongoDB database instance
            reason: Reason for validation (used in logging)
        
        Returns:
            Tuple of (is_valid: bool, message: str)
        """
        from bson import ObjectId
        
        # Get all appointments for this donor
        try:
            all_appointments = await db.appointments.find(
                {"donor_id": donor_id}
            ).to_list(None)
        except Exception as e:
            logger.error(f"Error fetching appointments: {e}")
            return False, "Database error checking availability"
        
        # Check 1: Rest days between donations
        rest_violation = self._check_rest_days_violation(
            proposed_time, all_appointments
        )
        if rest_violation:
            return False, rest_violation
        
        # Check 2: Max appointments per week
        weekly_violation = self._check_weekly_limit_violation(
            proposed_time, all_appointments
        )
        if weekly_violation:
            return False, weekly_violation
        
        # Check 3: No appointments in the past
        if _as_utc(proposed_time) < datetime.now(timezone.utc):
            return False, "Cannot book appointments in the past"
        
        logger.info(f"Appointment validation passed for donor {donor_id}: {reason}")
        return True, "Appointment slot is available"
    
    def _check_rest_days_violation(
        self,
        proposed_time: datetime,
        appointments: List[Dict]
    ) -> Optional[str]:
        """
        Check if proposed time violates rest day requirement.
        
        Args:
            proposed_time: Proposed appointment datetime
            appointments: List of donor's appointments
        
        Returns:
            Violation message if violated, None otherwise
        """
        now = datetime.now(timezone.utc)

        # Only count appointments that have already happened OR are scheduled
        # within the next 24 hours — future scheduled bookings don't impose
        # a rest period until they actually occur.
        eligible_appointments = [
            a for a in appointments
            if a.get("status") in ["completed", "scheduled"]
            and not a.get("no_show", False)
            and isinstance(a.get("scheduled_time"), datetime)
            and _as_utc(a["scheduled_time"]) <= now + timedelta(days=1)
        ]

        if not eligible_appointments:
            return None  # No recent donations to rest from

        # Find the most recent past/imminent appointment
        most_recent = max(
            eligible_appointments,
            key=lambda x: x["scheduled_time"]
        )
        
        last_donation_time = _as_utc(most_recent.get("scheduled_time"))
        if not last_donation_time:
            return None
        
        proposed_time = _as_utc(proposed_time)
        earliest_allowed = last_donation_time + timedelta(days=self.rest_days)
        
        if proposed_time < earliest_allowed:
            return (
                f"You need at least {self.rest_days} day(s) of rest between donations. "
                f"The earliest you can book is {earliest_allowed.strftime('%A, %b %d at %I:%M %p')}."
            )
        
        return None
    
    def _check_weekly_limit_violation(
        self,
        proposed_time: datetime,
        appointments: List[Dict]
    ) -> Optional[str]:
        """
        Check if proposed time violates weekly appointment limit.
        
        Args:
            proposed_time: Proposed appointment datetime
            appointments: List of donor's appointments
        
        Returns:
            Violation message if violated, None otherwise
        """
        # Get the Monday of the week containing proposed_time
        proposed_time = _as_utc(proposed_time)
        days_since_monday = proposed_time.weekday()  # 0=Monday, 6=Sunday
        week_start = proposed_time - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        
        # Count appointments in this week (excluding missed)
        week_appointments = [
            a for a in appointments
            if (a.get("status") in ["completed", "scheduled"] and
                not a.get("no_show", False) and
                week_start <= _as_utc(a.get("scheduled_time", datetime.min.replace(tzinfo=timezone.utc))) < week_end)
        ]
        
        if len(week_appointments) >= self.max_per_week:
            scheduled_times = ', '.join(
                a['scheduled_time'].strftime('%a %b %d at %I:%M %p')
                for a in week_appointments
                if isinstance(a.get('scheduled_time'), datetime)
            )
            return (
                f"You've reached the maximum of {self.max_per_week} donations for this week "
                f"(already booked: {scheduled_times}). You can book again from next Monday."
            )
        
        return None
    
    def get_next_available_week(
        self,
        appointments: List[Dict]
    ) -> Tuple[datetime, datetime]:
        """
        Get the next week when donor can schedule an appointment.
        
        Args:
            appointments: List of donor's appointments
        
        Returns:
            Tuple of (week_start, week_end) as datetime objects
        """
        current_time = datetime.now(timezone.utc)
        
        # Start from next Monday
        days_to_monday = (7 - current_time.weekday()) % 7
        next_monday = current_time + timedelta(days=days_to_monday)
        next_monday = next_monday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Check multiple weeks ahead until finding one with availability
        for weeks_ahead in range(52):  # Check up to 1 year
            week_start = next_monday + timedelta(weeks=weeks_ahead)
            week_end = week_start + timedelta(days=7)
            
            # Count appointments in this week
            week_appointments = [
                a for a in appointments
                if (a.get("status") in ["completed", "scheduled"] and
                    not a.get("no_show", False) and
                    week_start <= _as_utc(a.get("scheduled_time", datetime.min.replace(tzinfo=timezone.utc))) < week_end)
            ]
            
            if len(week_appointments) < self.max_per_week:
                return week_start, week_end
        
        # Shouldn't reach here, but return far future as fallback
        return next_monday + timedelta(weeks=52), next_monday + timedelta(weeks=53)
    
    def get_blocked_dates(
        self,
        appointments: List[Dict],
        num_days: int = 30
    ) -> List[Tuple[datetime, str]]:
        """
        Get list of blocked/restricted dates for a donor.
        
        Args:
            appointments: List of donor's appointments
            num_days: Number of days to check ahead
        
        Returns:
            List of (date, reason) tuples
        """
        blocked_dates = []
        current_time = datetime.now(timezone.utc)
        
        for i in range(num_days):
            check_date = current_time + timedelta(days=i)
            
            # Check if date is within 1 day of a recent appointment
            for appt in appointments:
                if appt.get("status") in ["completed"] and not appt.get("no_show"):
                    appt_time = appt.get("scheduled_time")
                    if appt_time:
                        appt_time = _as_utc(appt_time)
                        start_block = appt_time - timedelta(days=self.rest_days)
                        end_block = appt_time + timedelta(days=self.rest_days)

                        if start_block.date() <= check_date.date() <= end_block.date():
                            reason = f"Rest period from appointment on {appt_time.strftime('%Y-%m-%d')}"
                            if (check_date.date(), reason) not in blocked_dates:
                                blocked_dates.append((check_date.date(), reason))
        
        return blocked_dates
    
    def suggest_best_appointment_times(
        self,
        appointments: List[Dict],
        preferred_day_of_week: Optional[str] = None,
        preferred_hour: Optional[int] = None,
        num_suggestions: int = 3
    ) -> List[datetime]:
        """
        Suggest best appointment times based on constraints and preferences.
        
        Args:
            appointments: List of donor's appointments
            preferred_day_of_week: Day preference (Monday-Sunday)
            preferred_hour: Hour preference (0-23)
            num_suggestions: Number of times to suggest
        
        Returns:
            List of suggested appointment times
        """
        suggestions = []
        current_time = datetime.now(EASTERN)

        # Start checking from tomorrow midnight Eastern
        check_date = (current_time + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        max_days_to_search = 90  # safety cap — never search more than 3 months out
        days_checked = 0

        while len(suggestions) < num_suggestions and days_checked < max_days_to_search:
            days_checked += 1

            if self._check_rest_days_violation(check_date, appointments):
                check_date += timedelta(days=1)
                continue

            if self._check_weekly_limit_violation(check_date, appointments):
                # Jump to the following Monday instead of crawling day-by-day
                days_until_monday = (7 - check_date.weekday()) % 7 or 7
                check_date += timedelta(days=days_until_monday)
                continue

            # Add suggested times with preference consideration
            for hour in self._get_preferred_hours(preferred_hour):
                candidate_time = check_date.replace(hour=hour)
                if candidate_time > current_time:
                    suggestions.append(candidate_time)
                    if len(suggestions) >= num_suggestions:
                        return suggestions

            check_date += timedelta(days=1)

        return suggestions
    
    @staticmethod
    def _get_preferred_hours(preferred_hour: Optional[int] = None) -> List[int]:
        """Get list of hours to try, with preference first."""
        if preferred_hour is not None and 0 <= preferred_hour < 24:
            # Preferred hour first, then nearby hours
            base_hours = [10, 11, 14, 15, 16]  # Good donation times
            return [preferred_hour] + [h for h in base_hours if h != preferred_hour]
        return [10, 11, 14, 15, 16]  # 10am, 11am, 2pm, 3pm, 4pm
