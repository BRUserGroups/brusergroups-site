#!/usr/bin/env python3
"""BRSSUG meeting reminder script — checks content collection for upcoming/past meetings
and prints reminders based on the current date relative to meeting dates.

Usage: python3 scripts/meeting-reminder.py
(relative to the repo root)

Output: human-readable reminder text (empty if nothing to do).
"""

import json
import os
import re
from datetime import datetime, date, timedelta, timezone

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEETINGS_DIR = os.path.join(REPO_DIR, "src", "content", "meetings")

TODAY = date.today()

# Templates for the reminder text
TEMPLATE_PREP = """\
## Meeting Prep Reminder — {days_away} days until "{title}"

### Action items:
- [ ] **Confirm speaker & title** with {speaker}
- [ ] **Publish Meetup event** at https://www.meetup.com/baton-rouge-net-and-sql-server-user-groups/
- [ ] **Create meeting markdown file** in src/content/meetings/YYYY-MM-DD-speaker-slug.md
- [ ] **Write speaker bio** in the frontmatter `bio:` field
- [ ] **Post on X/Twitter** — @BRSSUG
- [ ] **Post on LinkedIn** — linkedin.com/company/brssug
- [ ] **Post on Bluesky** — @brssug.org
- [ ] **Email the mailing list** (Meetup handles this if you publish there)
"""

TEMPLATE_FOLLOWUP = """\
## Post-Meeting Follow-up — "{title}" was yesterday!

### Action items:
- [ ] **Add YouTube recording URL** to the meeting markdown file
- [ ] **Post recording on X/Twitter** — @BRSSUG
- [ ] **Post recording on LinkedIn** — linkedin.com/company/brssug
- [ ] **Post recording on Bluesky** — @brssug.org
- [ ] **Thank the speaker** {speaker} publicly
- [ ] **Update site content** if needed (commit + push to deploy)
"""

TEMPLATE_WEEKLY = """\
## Weekly Social Media Check

### Action items:
- [ ] **Post about next meeting** on X/Twitter (@BRSSUG)
- [ ] **Post on LinkedIn** (linkedin.com/company/brssug)
- [ ] **Post on Bluesky** (@brssug.org)
- [ ] **Share to Slack** (#brusergroups)
- [ ] **Check Meetup RSVPs** and send a reminder if needed
"""


def parse_meeting_date(filename):
    """Extract date from meeting filename: YYYY-MM-DD-speaker-slug.md"""
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", filename)
    if match:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    return None


def parse_meeting_frontmatter(filepath):
    """Parse basic frontmatter from a markdown file (no YAML lib needed)."""
    result = {"title": "", "speaker": "", "meetupUrl": ""}
    try:
        with open(filepath, "r") as f:
            content = f.read()
        # Extract frontmatter between --- markers
        parts = content.split("---")
        if len(parts) >= 3:
            frontmatter = parts[1]
            for line in frontmatter.strip().split("\n"):
                for key in result:
                    if line.startswith(f"{key}:"):
                        result[key] = line.split(":", 1)[1].strip().strip('"')
    except Exception:
        pass
    return result


def main():
    if not os.path.isdir(MEETINGS_DIR):
        return  # not the repo root

    meetings = []
    for fname in os.listdir(MEETINGS_DIR):
        if fname == "_TEMPLATE.md" or not fname.endswith(".md"):
            continue
        meeting_date = parse_meeting_date(fname)
        if meeting_date:
            fpath = os.path.join(MEETINGS_DIR, fname)
            meta = parse_meeting_frontmatter(fpath)
            meetings.append((meeting_date, meta))

    if not meetings:
        return

    now = TODAY

    messages = []

    for meeting_date, meta in meetings:
        days_until = (meeting_date - now).days
        days_since = (now - meeting_date).days

        speaker = meta.get("speaker", "TBD")
        title = meta.get("title", "TBD")

        # Prep reminder: 14 days before, 7 days before, and 3 days before
        if days_until in (14, 7, 3, 1):
            messages.append(TEMPLATE_PREP.format(
                days_away=days_until, title=title, speaker=speaker
            ))

        # Follow-up: 1 day after
        if days_since == 1:
            messages.append(TEMPLATE_FOLLOWUP.format(
                title=title, speaker=speaker
            ))

    # Weekly social media check (runs on Monday — the cron schedule handles this)
    if now.weekday() == 0:  # Monday
        messages.append(TEMPLATE_WEEKLY)

    if messages:
        print("\n\n".join(messages))
    else:
        # No reminders today — silent exit (no output = no delivery)
        pass


if __name__ == "__main__":
    main()