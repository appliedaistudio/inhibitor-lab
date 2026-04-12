# Demo Day Checklist — Sunday April 12

## Saturday night (before sleep)

- [ ] Record backup demo video (2-3 min, narrated, shows all surfaces working)
- [ ] Charge Tello batteries (2+ fully charged)
- [ ] Charge demo phone (the one running SMS + PWA install)
- [ ] Charge laptop fully
- [ ] Verify Twilio phone number still active
- [ ] Test SMS round-trip end-to-end from an external phone
- [ ] Test PWA install on both iOS and Android phones if possible
- [ ] Test drone flight with the exact cardboard prop you'll use
- [ ] Print 3 copies of pitch script (backup in case stage laptop freezes)
- [ ] Export Inhibitor intervention log as CSV for Glass Box tab
- [ ] Confirm who is doing which part of the demo

## Sunday morning

- [ ] Ask staff: "Can Glass Box accept our own Inhibitor logs or does it require your shared dataset?"
- [ ] Ask staff: "Is it okay to fly a micro-drone (Tello) on the presentation stage?"
- [ ] If drone flight denied → activate backup video for that segment
- [ ] Final README pass — make sure every section matches current state of code
- [ ] Commit and push final version before submission
- [ ] Submit final links (repo, demo video, live URL) on the Codefest platform
- [ ] Rehearse pitch at least twice in full, with props

## On stage

- [ ] Laptop plugged in (never trust battery)
- [ ] Laptop audio off (no notification sounds)
- [ ] Phone set to airplane mode except Wi-Fi (prevent incoming calls during demo)
- [ ] Drone visibly powered on, propeller guards on
- [ ] Cardboard building prop positioned so drone has 1m clearance
- [ ] Backup video queued in a second browser tab
- [ ] Pitch script printed copy in pocket

## Recovery plan — if something breaks live

| Broken | Recovery |
|---|---|
| Drone won't connect | "Here's what it would have looked like" → cut to backup video |
| Web app 500s | "Here's the SMS version" → pivot to phone demo |
| SMS timeout | "And this one's our web version" → keep going |
| Laptop freezes | Pull out phone, show PWA, narrate remainder |
| Inhibitor API down | "Here's our logged dataset showing 147 interventions" → pivot to dashboard |

**Golden rule:** never say "oops" or "it's not working." Always redirect with "here's another way to show it."

## At least 2 team members on site (challenge requirement)

Lock in who's physically presenting. The other two can be remote for backup.
