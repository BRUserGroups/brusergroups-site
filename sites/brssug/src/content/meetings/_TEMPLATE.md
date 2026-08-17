---
# Copy this file, rename it YYYY-MM-DD-speaker-slug.md, and fill in the fields below.
# Keep the filename lowercase-kebab-case — it becomes both this site's permalink slug
# and the WordPress cross-post slug (scripts/sync-wordpress.mjs); the two must match.
# Leave optional fields commented out if not yet known.
title: "Session Title Here"
date: 2026-01-01
speaker: "Speaker Full Name"
# category: "Meeting"                      # defaults to "Meeting" if omitted; override for e.g. "Announcement"
# sessionizeId: "speaker-sessionize-id"    # the speaker's Sessionize GUID (e.g. "116e619f-d8af-4bdf-b00a-2d10da3a9d08" — see src/data/generated/speakers.json), NOT the numeric speakerId/sessionId pair shown on sessionize.com. Pulls bio, tagline, photo, and — if the body below is left blank — the session description too.
# bio: "Speaker bio"                       # only needed if the speaker isn't in Sessionize
# meetupUrl: "https://www.meetup.com/baton-rouge-net-and-sql-server-user-groups/events/EVENTID/"  # add once the Meetup event exists — the site works fine without it in the meantime
# youtubeUrl: "https://youtu.be/VIDEO_ID"  # add after the meeting
# sponsor: "Company Name"
# sponsorUrl: "https://example.com"        # optional — links the sponsor name on the site if given
# lightningSpeaker: "Lightning Speaker Name"  # only if this meeting had a lightning talk — not every meeting does
# lightningTitle: "Lightning Talk Title"      # required together with lightningSpeaker for it to show on the site
# lightningSessionizeId: "lightning-speaker-sessionize-id"  # optional — the lightning speaker's Sessionize GUID, for their photo. Falls back to an initial-letter avatar if omitted or not found.
---

Session abstract or description goes here. This shows on the event card and meeting detail page,
and can be copy-pasted straight into the Meetup event description once you create it there.

Leave this blank if sessionizeId is set above — the description will be pulled from Sessionize
automatically. If both are present, this text takes priority over the Sessionize description.
