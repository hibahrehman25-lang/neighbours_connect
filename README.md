# TribeKnit

### Connecting Communities. Our Neighborhood, Our Family.

A hyperlocal, AI assisted neighborhood safety and community platform built for residential areas in Pakistan.

Live App: https://neighbours-connect-ause.vercel.app
Source Code: https://github.com/hibahrehman25-lang/neighbours_connect

---

## The Problem This App Solves

Modern life has quietly eroded something that used to be a given: knowing the people who live around you.

Everyone is busy with work, studies, and family, and most of us no longer know our neighbors beyond a passing nod. This is not just a loss of community, it is a real safety gap. When something goes wrong, a break in, a medical emergency, someone falling seriously ill alone at home, many people hesitate to reach out at all. Out of embarrassment, or simply because they do not know who to ask, they either stay silent or tell only one or two very close contacts. Help that could have arrived from three houses away never gets the chance to.

The tools people currently rely on, informal WhatsApp groups and Facebook groups, were never built for this. They are noisy, they are not location aware, and nobody in them is verified to actually live nearby. There is no structure for urgency, no way to see what is happening within your literal walking distance, and no clean way to lend or ask for a hand without it becoming either a public spectacle or an awkward direct message to someone you barely know.

TribeKnit closes that gap. It is a lightweight, location verified space where an entire residential block, defined by a real one kilometer radius and not a group someone happened to add you to, can quietly look out for each other.

Who this is for: residents of housing societies and dense urban neighborhoods across Pakistan (the pilot context for this build is Lahore) who want a low effort way to stay aware of and connected to the people physically closest to them, for safety, for everyday small favors, and for the kind of casual community updates, a load shedding alert, a lost pet, a borrowed drill, that used to happen over the boundary wall and rarely do anymore.

---

## Feature Overview

### Verified, Location Based Accounts

Every account is created with email and password, and the app captures the user's GPS location at signup so that every profile is anchored to a real physical place. If a browser blocks location access, signup still completes smoothly rather than trapping the user at onboarding. Each user also uploads a verification document at signup; in this deployed build, verification completes automatically shortly after upload to keep the demo self contained, while a production rollout of this same flow would route the document to manual review before a resident earns the Verified Resident badge shown on their profile.

### A Map First Neighborhood Dashboard

The Feed opens with an interactive map as its primary view rather than a plain scrolling list. Nearby SOS alerts, help requests, marketplace listings, and general posts are plotted as color coded pins (red for emergencies, green for marketplace, yellow for lost and found), turning the app into something closer to a live neighborhood dashboard than a social timeline. Users can switch between this map view and a traditional list view at any time. The map is built entirely with Leaflet and OpenStreetMap, so there is no dependency on a paid Google Maps key anywhere in the app.

### A Hyperlocal Feed

Posts are visible only to people within one kilometer of the poster, calculated live using the Haversine distance formula. Every post can carry a photo attachment, particularly useful for a Lost and Found listing where a picture of a missing pet or a dropped ID card makes identification far easier. Posts support likes and comments, with full edit and delete controls on a user's own comments, a delete option on a user's own posts, and a report button for community moderation. A search bar on the Feed lets a resident find any neighbor by name and open a private, one to one chat with them directly, without ever exchanging phone numbers.

### SOS Emergency Alerts

A single, always visible SOS button creates an emergency alert instantly. The alert is pushed in real time, through Supabase's Realtime engine rather than any third party notification service, to every other user within one kilometer the moment it is sent. Recipients receive an audible alert and a browser notification, and the new alert appears live on their screen without needing a refresh. A live map shows the alert's location with a visual one kilometer radius. Before sending, a user can optionally describe what is happening, and the app asks Gemini to generate three situation specific safety instructions, shown clearly on the alert to everyone nearby. If Gemini is temporarily unavailable, the alert still sends immediately and the app falls back to safe, general guidance rather than blocking the emergency flow in any way. If an alert was triggered by mistake, its sender can cancel it immediately.

The scenario this was designed for: a resident notices WAPDA has cut power to the block. Instead of telling only the one or two neighbors they happen to have numbers for, they send one alert, and everyone within a real one kilometer radius sees it in seconds. The same logic applies just as well to a security concern, a fire, or a medical emergency.

### A Neighborhood Marketplace

Residents can list items to sell, rent, borrow, or offer as a service, chairs and tables for an event, a spare drill machine, a small loan to be repaid, medicine someone urgently needs. Every listing supports a photo and is geo filtered to the same one kilometer radius as the Feed, with simple filters to narrow results by type, distance, and price range. Messaging the lister is a single tap away.

---

## The AI Feature

TribeKnit's AI layer runs on Google's Gemini API, called through two custom server routes built specifically for this app, each with its own purpose written system prompt rather than a generic wrapper.

1. Automatic post classification and reply drafting, at the `/api/classify` route.

Every post's text is sent to Gemini and classified into one of four categories: Emergency, Help Request, Marketplace, or General, regardless of which category the user manually selected. This means that if someone in genuine distress simply types "cannot breathe, please help" without thinking to change the dropdown, the AI still recognizes it and reclassifies the post as an emergency. For posts classified as Help Request or Marketplace, Gemini also drafts a short, natural, Urdu and English mixed reply that a neighbor could send, lowering the effort it takes for someone to actually respond.

System prompt used:
You are Mohallah Assistant for a Pakistani neighborhood app. Given a post's text,
classify it into exactly one category: EMERGENCY, HELP_REQUEST, MARKETPLACE, or GENERAL.
Then, if category is HELP_REQUEST or MARKETPLACE, write one short polite message
(max 2 sentences, natural Urdu-English mix as Pakistanis speak) that the requester
could send to a neighbor. Return ONLY valid JSON, no markdown, no backticks:
{"category": "...", "suggested_message": "..." or null}
2. AI safety guidance for SOS alerts, at the `/api/sos-guidance` route.

When a user optionally describes their emergency before sending an SOS alert, this route asks Gemini to turn that description into three short, immediate, situation specific safety instructions, which are then stored with the alert and displayed clearly to every neighbor who sees it.

System prompt used:
You are a safety assistant for a neighborhood emergency app in Pakistan.
Given a short description of an emergency situation, respond with exactly
3 short, practical, immediate safety instructions (max 10 words each) that
the person reporting AND their nearby neighbors should follow right now.
Prioritize life safety over property. Use plain, calm English.
If the description is empty or unclear, give 3 general emergency-safety
instructions instead. Return ONLY valid JSON, no markdown, no backticks:
{"instructions": ["...", "...", "..."]}
Model used: gemini 2.0 flash

A deliberate reliability decision: both AI routes are treated as best effort, never as a single point of failure. If Gemini is rate limited or briefly unavailable, a post still publishes using the user's manually chosen category, and an SOS alert still sends immediately with safe fallback guidance. Given that this app touches genuine safety use cases, it was a firm design principle from the start that an external AI outage should never be able to block a user in an emergency.

Honest note on scope: the current AI layer is intentionally focused on classification, reply drafting, and safety guidance, chosen as the most reliable and thoroughly testable AI features achievable within the project timeline. It is the foundation of a larger roadmap rather than the final ceiling of what AI will do inside this app.

What comes next:

Computer vision matching for Lost and Found photos across posts within the same block.

Automatic clustering when several nearby residents independently report the same issue, for example multiple no light posts in a short window being recognized and flagged as a single area wide outage.

Proactive matching that surfaces a Borrow request to specific neighbors whose past posts suggest they own the relevant item.

---

## Tools, Services, and Technologies

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend and database | Supabase, PostgreSQL, Authentication, Realtime, Storage |
| AI | Google Gemini API (gemini 2.0 flash) for post classification, reply suggestions, and SOS safety guidance |
| Maps | Leaflet with OpenStreetMap, free and requiring no API key |
| Branding and logo | Canva |
| Hosting and deployment | Vercel |
| Email delivery | Supabase Auth email and Resend |

---

## How Supabase Powers This App

Supabase is the entire backend of TribeKnit: the Postgres database, all authentication, the Realtime channels behind SOS alerts and private messaging, and file storage for every post and marketplace photo. Every table, including profiles, posts, marketplace items, sos alerts, likes, comments, messages, and reports, is protected with Row Level Security policies, so a user can only read or modify data they are genuinely authorized to touch.

Built entirely on free tiers, two limitations are worth stating plainly rather than hiding:

Email delivery is rate limited. Free tier email providers restrict how many confirmation emails can be sent per hour, which affects how quickly a brand new signup receives their confirmation link during heavy testing. It does not affect how many users the app can support, Supabase's free tier supports up to fifty thousand users.

To remove this friction entirely for evaluation, a pre verified demo account is provided below that bypasses email confirmation altogether.

### Demo Account (Recommended for Evaluation)
Email: demo@tribeknit.app
Password: TribeKnit2026
This account is pre populated with sample posts and marketplace listings, and shares its location with existing test data, so real content is visible immediately on login.

### Testing Private Messaging

Private messaging naturally requires two accounts to demonstrate meaningfully. After logging in with the demo account, search for "Hibah Rehman" in the neighbor search bar on the Feed, this is the primary test account and shares the same area as the demo account, and tap Message to open a live, real time chat.

---

## Screenshots

Add three or more screenshots here before final submission: the map first Feed, an SOS alert with AI safety guidance visible, the Marketplace, and a post showing the AI suggested reply.
---

## Running This Project Locally

```bash
git clone https://github.com/hibahrehman25-lang/neighbours_connect.git
cd neighbours_connect
npm install
```

Create a file named `.env.local` in the project root with the following:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```bash
npm run dev
```

Then open http://localhost:3000 in a browser.

No API keys or secrets are committed anywhere in this repository. All secrets live as environment variables on Vercel for the deployed build.

---

## Acknowledgments

This project would not exist in its current form without a set of genuinely excellent free tools: the Supabase team for a backend platform that makes authentication, a real database, realtime channels, and file storage all feel like one coherent product; the Google Gemini team for an accessible AI API that made the classification and safety guidance features possible; the OpenStreetMap and Leaflet communities for proving that a fully featured, interactive map does not require a paid API key; and Vercel for deployment that stayed out of the way entirely.

---

## About the Developer

Hibah Rehman
Computer Science student at UVAS Lahore, batch 2024 to 2028
AI and machine learning enthusiast, currently completing an ML focused internship at FlyRank AI

GitHub: https://github.com/hibahrehman25-lang
LinkedIn: https://www.linkedin.com/in/hiba-rehman-tech

TribeKnit was built as an individual final project for the Ship Your AI App assignment, designed, built, and shipped end to end as original work.
