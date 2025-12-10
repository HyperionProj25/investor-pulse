-- Seed data for site_state and update_history tables
-- Data sourced from lib/questionnaire.ts BASELINE_UPDATE

INSERT INTO public.site_state (payload, version, updated_by)
VALUES (
  '{
    "hero": {
      "kicker": "Investor snapshot",
      "h1Lead": "Live view into",
      "h1Accent": "Baseline",
      "h1Trail": "progress.",
      "mission": "Baseline is building the performance data layer for baseball and softball. This page gives investors a single place to see where we are now, what''s coming next, and how the round is progressing.",
      "descriptor": "Send this URL with a query string (e.g., ?investor=amy-chen) and it will welcome them by name with the proof points they''re watching."
    },
    "metadata": {
      "lastUpdated": "2025-12-03",
      "launchTarget": "2026-03-01T00:00:00-08:00",
      "milestoneLabel": "investor hub + facility beta milestone"
    },
    "funding": {
      "roundType": "Pre-Seed SAFE",
      "target": 500000,
      "committed": 220000,
      "minCheck": "$25k+",
      "closeDate": "June 30, 2026",
      "useOfFunds": "Ship facility OS, automate reports, and grow the data set."
    },
    "snapshots": [
      {
        "label": "Baseline snapshot - Q4 2025",
        "asOf": "November 30, 2025",
        "facilities": 2,
        "teams": 10,
        "players": 140,
        "events": 4,
        "dataPoints": 750000,
        "highlights": [
          "Closed initial pilot with 2 facilities and 10 teams onboarded.",
          "Completed first full combine cycle with baseline + follow-up reports.",
          "Proved workflow from raw device data to clean, coach-ready reports."
        ]
      },
      {
        "label": "Latest snapshot - projected Q1 2026",
        "asOf": "March 1, 2026 (target)",
        "facilities": 4,
        "teams": 24,
        "players": 320,
        "events": 8,
        "dataPoints": 2100000,
        "highlights": [
          "Scale pilots to 4+ facilities and 20+ travel / high school teams.",
          "Launch investor-facing hub and internal facility dashboard v1.",
          "Start building the unified performance dataset for ages 13-21."
        ]
      }
    ],
    "tractionNarrative": "This section will evolve into a small dashboard of teams, players, events, and key Baseline metrics over time. For now, it''s a placeholder while we lock in structure and visuals.",
    "investors": [
      {
        "slug": "amy-chen",
        "name": "Amy Chen",
        "firm": "Signal Loop Capital",
        "title": "General Partner",
        "focusArea": "obsessive about clean datasets and recurring facility revenue.",
        "welcomeNote": "You asked for proof that we can scale beyond early pilots without losing data quality. Here''s the build in flight.",
        "highlight": "Two facilities instrumented, with the next two under contract.",
        "keyQuestions": [
          "How defensible is the performance data moat?",
          "What does activation look like per facility?",
          "How does Baseline stay in the workflow daily?"
        ],
        "nextStep": "Line up deep dive before 01.15 to scope a $100k SAFE.",
        "pixelAccent": "#ffb347",
        "pixelMuted": "#f6e1bd",
        "pin": "0417"
      },
      {
        "slug": "marco-vale",
        "name": "Marco Vale",
        "firm": "Diamond Yard Ventures",
        "title": "Founding Partner",
        "focusArea": "cares about facility economics and future upside for youth orgs.",
        "welcomeNote": "You wanted conviction that Baseline can become the default operating system for training centers.",
        "highlight": "Pipeline to 4 facilities and 20+ travel clubs in flight.",
        "keyQuestions": [
          "Timeline to 10 facilities?",
          "How fast can coaches log in and share reports?",
          "When does monetization expand past software?"
        ],
        "nextStep": "Targeting $150k co-lead check pending January KPI review.",
        "pixelAccent": "#fb923c",
        "pixelMuted": "#ffe3c3",
        "pin": "2311"
      },
      {
        "slug": "daniela-ross",
        "name": "Daniela Ross",
        "firm": "Future Diamond Fund",
        "title": "Partner",
        "focusArea": "youth talent pipelines and equitable access.",
        "welcomeNote": "You asked how Baseline becomes the connective tissue between tournaments, colleges, and pro scouting.",
        "highlight": "First unified dataset for ages 13-21 is underway.",
        "keyQuestions": [
          "Will the data be shareable with college recruiters?",
          "How do we keep the athlete at the center?",
          "Where do NIL and financial products plug in?"
        ],
        "nextStep": "Book a working session on the data room before the next board.",
        "pixelAccent": "#38bdf8",
        "pixelMuted": "#e0f2fe",
        "pin": "8080"
      },
      {
        "slug": "tom-castillo",
        "name": "Tom Castillo",
        "firm": "Granite Peak Capital",
        "title": "Managing Partner",
        "focusArea": "evaluating operator-led software with clear data moats.",
        "welcomeNote": "You asked what it looks like when Baseline becomes the nerve center of every elite facility - here''s the momentum.",
        "highlight": "Facility OS is locking in and the data flywheel is compounding.",
        "keyQuestions": [
          "How fast can we productize facility workflows?",
          "What keeps the dataset proprietary as we scale?",
          "Where does Baseline drive upsell leverage post-launch?"
        ],
        "nextStep": "Deeper dive week of Jan 22 to frame a $200k lead check.",
        "pixelAccent": "#c084fc",
        "pixelMuted": "#f5e0ff",
        "pin": "5544"
      },
      {
        "slug": "pre-pitch-deck",
        "name": "PRE PITCH DECK",
        "firm": "Baseline",
        "title": "Pitch Deck Viewer",
        "focusArea": "exploring Baseline''s vision and opportunity.",
        "welcomeNote": "Welcome to Baseline''s pitch deck. Explore our mission to build the performance data layer for baseball and softball.",
        "highlight": "Building the future of youth sports performance tracking.",
        "keyQuestions": [
          "What problem does Baseline solve?",
          "How big is the market opportunity?",
          "Why now, and why this team?"
        ],
        "nextStep": "Review the deck and reach out to discuss partnership opportunities.",
        "pixelAccent": "#cb6b1e",
        "pixelMuted": "#f6e1bd",
        "pin": "2524"
      }
    ],
    "updatePrompts": [
      {
        "id": "audience-persona",
        "category": "Audience",
        "question": "Who is this investor or partner (name, firm, role)?",
        "helper": "Drives welcome animation + CTA tone."
      },
      {
        "id": "wins-metrics",
        "category": "Performance",
        "question": "What changed since the last send (facilities, teams, players, data points)?",
        "helper": "Populates the live snapshot + highlights."
      },
      {
        "id": "fundraise-status",
        "category": "Capital",
        "question": "How much is committed, what is the target, min check, and planned close date?",
        "helper": "Fuels the funding bar + cards."
      },
      {
        "id": "milestone",
        "category": "Roadmap",
        "question": "What milestone or launch are we counting down toward?",
        "helper": "Updates the countdown label + timer."
      },
      {
        "id": "support-needed",
        "category": "Asks",
        "question": "What support or action do we want from this person?",
        "helper": "Shows up in the welcome card next step."
      },
      {
        "id": "story-angle",
        "category": "Narrative",
        "question": "What is the single sentence story for this batch of updates?",
        "helper": "Refreshes the mission text + hero descriptor."
      }
    ],
    "mvpSnapshot": {
      "title": "MVP Snapshot",
      "ctaLabel": "Update schedule",
      "previous": {
        "label": "Previous task",
        "title": "Facility OS investor preview",
        "description": "Ran the full workflow end-to-end with the investor dashboard.",
        "statusLabel": "Completed Nov 30"
      },
      "next": {
        "label": "Next task",
        "title": "Deploy facility beta",
        "description": "Instrument two additional training centers and publish shared analytics.",
        "statusLabel": "Target Jan 31"
      }
    }
  }'::jsonb,
  1,
  'Initial Seed'
);


-- Insert same data into update_history as the first historical record
INSERT INTO public.update_history (author, payload, notes)
VALUES (
  'Initial Seed',
  '{
    "hero": {
      "kicker": "Investor snapshot",
      "h1Lead": "Live view into",
      "h1Accent": "Baseline",
      "h1Trail": "progress.",
      "mission": "Baseline is building the performance data layer for baseball and softball. This page gives investors a single place to see where we are now, what''s coming next, and how the round is progressing.",
      "descriptor": "Send this URL with a query string (e.g., ?investor=amy-chen) and it will welcome them by name with the proof points they''re watching."
    },
    "metadata": {
      "lastUpdated": "2025-12-03",
      "launchTarget": "2026-03-01T00:00:00-08:00",
      "milestoneLabel": "investor hub + facility beta milestone"
    },
    "funding": {
      "roundType": "Pre-Seed SAFE",
      "target": 500000,
      "committed": 220000,
      "minCheck": "$25k+",
      "closeDate": "June 30, 2026",
      "useOfFunds": "Ship facility OS, automate reports, and grow the data set."
    },
    "snapshots": [
      {
        "label": "Baseline snapshot - Q4 2025",
        "asOf": "November 30, 2025",
        "facilities": 2,
        "teams": 10,
        "players": 140,
        "events": 4,
        "dataPoints": 750000,
        "highlights": [
          "Closed initial pilot with 2 facilities and 10 teams onboarded.",
          "Completed first full combine cycle with baseline + follow-up reports.",
          "Proved workflow from raw device data to clean, coach-ready reports."
        ]
      },
      {
        "label": "Latest snapshot - projected Q1 2026",
        "asOf": "March 1, 2026 (target)",
        "facilities": 4,
        "teams": 24,
        "players": 320,
        "events": 8,
        "dataPoints": 2100000,
        "highlights": [
          "Scale pilots to 4+ facilities and 20+ travel / high school teams.",
          "Launch investor-facing hub and internal facility dashboard v1.",
          "Start building the unified performance dataset for ages 13-21."
        ]
      }
    ],
    "tractionNarrative": "This section will evolve into a small dashboard of teams, players, events, and key Baseline metrics over time. For now, it''s a placeholder while we lock in structure and visuals.",
    "investors": [
      {
        "slug": "amy-chen",
        "name": "Amy Chen",
        "firm": "Signal Loop Capital",
        "title": "General Partner",
        "focusArea": "obsessive about clean datasets and recurring facility revenue.",
        "welcomeNote": "You asked for proof that we can scale beyond early pilots without losing data quality. Here''s the build in flight.",
        "highlight": "Two facilities instrumented, with the next two under contract.",
        "keyQuestions": [
          "How defensible is the performance data moat?",
          "What does activation look like per facility?",
          "How does Baseline stay in the workflow daily?"
        ],
        "nextStep": "Line up deep dive before 01.15 to scope a $100k SAFE.",
        "pixelAccent": "#ffb347",
        "pixelMuted": "#f6e1bd",
        "pin": "0417"
      },
      {
        "slug": "marco-vale",
        "name": "Marco Vale",
        "firm": "Diamond Yard Ventures",
        "title": "Founding Partner",
        "focusArea": "cares about facility economics and future upside for youth orgs.",
        "welcomeNote": "You wanted conviction that Baseline can become the default operating system for training centers.",
        "highlight": "Pipeline to 4 facilities and 20+ travel clubs in flight.",
        "keyQuestions": [
          "Timeline to 10 facilities?",
          "How fast can coaches log in and share reports?",
          "When does monetization expand past software?"
        ],
        "nextStep": "Targeting $150k co-lead check pending January KPI review.",
        "pixelAccent": "#fb923c",
        "pixelMuted": "#ffe3c3",
        "pin": "2311"
      },
      {
        "slug": "daniela-ross",
        "name": "Daniela Ross",
        "firm": "Future Diamond Fund",
        "title": "Partner",
        "focusArea": "youth talent pipelines and equitable access.",
        "welcomeNote": "You asked how Baseline becomes the connective tissue between tournaments, colleges, and pro scouting.",
        "highlight": "First unified dataset for ages 13-21 is underway.",
        "keyQuestions": [
          "Will the data be shareable with college recruiters?",
          "How do we keep the athlete at the center?",
          "Where do NIL and financial products plug in?"
        ],
        "nextStep": "Book a working session on the data room before the next board.",
        "pixelAccent": "#38bdf8",
        "pixelMuted": "#e0f2fe",
        "pin": "8080"
      },
      {
        "slug": "tom-castillo",
        "name": "Tom Castillo",
        "firm": "Granite Peak Capital",
        "title": "Managing Partner",
        "focusArea": "evaluating operator-led software with clear data moats.",
        "welcomeNote": "You asked what it looks like when Baseline becomes the nerve center of every elite facility - here''s the momentum.",
        "highlight": "Facility OS is locking in and the data flywheel is compounding.",
        "keyQuestions": [
          "How fast can we productize facility workflows?",
          "What keeps the dataset proprietary as we scale?",
          "Where does Baseline drive upsell leverage post-launch?"
        ],
        "nextStep": "Deeper dive week of Jan 22 to frame a $200k lead check.",
        "pixelAccent": "#c084fc",
        "pixelMuted": "#f5e0ff",
        "pin": "5544"
      },
      {
        "slug": "pre-pitch-deck",
        "name": "PRE PITCH DECK",
        "firm": "Baseline",
        "title": "Pitch Deck Viewer",
        "focusArea": "exploring Baseline''s vision and opportunity.",
        "welcomeNote": "Welcome to Baseline''s pitch deck. Explore our mission to build the performance data layer for baseball and softball.",
        "highlight": "Building the future of youth sports performance tracking.",
        "keyQuestions": [
          "What problem does Baseline solve?",
          "How big is the market opportunity?",
          "Why now, and why this team?"
        ],
        "nextStep": "Review the deck and reach out to discuss partnership opportunities.",
        "pixelAccent": "#cb6b1e",
        "pixelMuted": "#f6e1bd",
        "pin": "2524"
      }
    ],
    "updatePrompts": [
      {
        "id": "audience-persona",
        "category": "Audience",
        "question": "Who is this investor or partner (name, firm, role)?",
        "helper": "Drives welcome animation + CTA tone."
      },
      {
        "id": "wins-metrics",
        "category": "Performance",
        "question": "What changed since the last send (facilities, teams, players, data points)?",
        "helper": "Populates the live snapshot + highlights."
      },
      {
        "id": "fundraise-status",
        "category": "Capital",
        "question": "How much is committed, what is the target, min check, and planned close date?",
        "helper": "Fuels the funding bar + cards."
      },
      {
        "id": "milestone",
        "category": "Roadmap",
        "question": "What milestone or launch are we counting down toward?",
        "helper": "Updates the countdown label + timer."
      },
      {
        "id": "support-needed",
        "category": "Asks",
        "question": "What support or action do we want from this person?",
        "helper": "Shows up in the welcome card next step."
      },
      {
        "id": "story-angle",
        "category": "Narrative",
        "question": "What is the single sentence story for this batch of updates?",
        "helper": "Refreshes the mission text + hero descriptor."
      }
    ],
    "mvpSnapshot": {
      "title": "MVP Snapshot",
      "ctaLabel": "Update schedule",
      "previous": {
        "label": "Previous task",
        "title": "Facility OS investor preview",
        "description": "Ran the full workflow end-to-end with the investor dashboard.",
        "statusLabel": "Completed Nov 30"
      },
      "next": {
        "label": "Next task",
        "title": "Deploy facility beta",
        "description": "Instrument two additional training centers and publish shared analytics.",
        "statusLabel": "Target Jan 31"
      }
    }
  }'::jsonb,
  'Baseline content from codebase'
);
