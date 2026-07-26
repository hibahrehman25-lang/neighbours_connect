# TribeKnit — Connecting Communities

**Our Neighborhood, Our Family.**

> A hyperlocal, AI-assisted neighborhood safety and community platform for residential areas in Pakistan.
**🔗 Live App:** [https://neighbours-connect-ause.vercel.app](https://neighbours-connect-ause.vercel.app)
**🔗 Source Code:** [https://github.com/hibahrehman25-lang/neighbours_connect](https://github.com/hibahrehman25-lang/neighbours_connect)

---

## 1. The Problem

Modern life has quietly eroded something that used to be a given: knowing the people who live around you.

Everyone is busy — work, studies, family — and the result is that most of us no longer know our neighbors beyond a nod in the parking lot. This isn't just a loss of community; it's a safety gap. When something actually goes wrong — a break-in, a medical emergency, someone falling seriously ill alone at home — many people hesitate to reach out. Out of embarrassment, or simply because they don't know *who* to ask, they either stay silent or, at best, tell one or two very close contacts. Help that could have arrived from three houses away never gets the chance to.

The tools people currently use — WhatsApp groups, informal Facebook groups — are not built for this. They're noisy, they're not location-aware (a "neighborhood" WhatsApp group frequently includes people who don't actually live nearby), and nobody in them is verified to actually be a resident. There is no structure for urgency, no way to see what's happening within your literal walking distance, and no clean way to lend a hand — or ask for one — without it turning into either a public spectacle or an awkward one-on-one DM to someone you barely know.

**TribeKnit exists to close that gap**: a lightweight, location-verified space where an entire residential community — defined by a real 1km radius, not a group someone happened to add you to — can quietly look out for each other.

**Who it's for:** residents of housing societies and dense urban neighborhoods in Pakistan (the pilot design context is Lahore) who want a low-effort way to stay aware of and connected to the people physically closest to them — for safety, for small everyday help, and for the kind of casual community info-sharing (load-shedding updates, a lost pet, borrowing a drill) that used to happen over the boundary wall and now mostly doesn't.

---

## 2. What TribeKnit Does — Current Feature Set

### 🔐 Verified, Location-Based Accounts
- Email + password signup with GPS location capture when available, so every account is anchored to a real physical location.
- If a browser blocks location permission, signup still falls back safely so users are not stuck at onboarding.
- Users upload a verification document (utility bill / ID) at signup. In this deployed version, verification auto-completes shortly after upload to keep the demo self-contained; in a production rollout this step would route to manual/admin review before a resident is marked **Verified**.
- A **Verified Resident** badge is shown on every profile once this step completes, so neighbors can tell at a glance who has actually confirmed their address versus a pending account.

### 🧭 Map-First Neighborhood Dashboard
- The feed now opens with the map first, so the most important local activity is visible immediately.
- Nearby SOS alerts, help requests, marketplace items, and general posts are shown with clear pins and simple neighborhood zones.
- The map includes lightweight area overlays for emergency, help, marketplace, and quiet/safe zones so the app feels like a local dashboard instead of a social timeline.

### 📰 Hyperlocal Feed (1km Radius)
- Every post is only visible to people within 1km of the poster — calculated live with the Haversine formula, with no paid mapping API involved.
- Post categories: **General**, **Help Needed**, **Marketplace**, **Lost & Found**, **Emergency**.
- Photo attachments on any post (useful for Lost & Found in particular — a missing pet or dropped ID card is far easier to identify with a picture).
- Likes and comments on posts, with full edit and delete support on your own comments.
- Delete your own posts at any time.
- Report button on every post, for community moderation.
- In-app **private messaging** — search for a neighbor by name, or message directly from their post, and talk one-to-one without leaving the app or exchanging phone numbers.
- Real neighbor names and avatars on every post — this is not an anonymous board; it's your actual, verified block.
- A search bar on the feed lets residents quickly find a neighbor and start a private chat.

### 🆘 SOS Emergency Alerts
- A single, always-visible SOS button. One tap creates an emergency alert instantly.
- The alert is pushed in **real time** (via Supabase's Realtime engine — no third-party SMS/notification service) to every other user within 1km, the moment it's sent.
- Recipients get an audible alert plus a browser notification, and the alert appears live on their SOS screen without needing to refresh.
- A live map shows the alert location with a visual 1km radius, plus simple neighborhood zones to make the situation easier to read at a glance.
- Users can optionally add a short description before sending SOS, and the app generates AI safety guidance for that specific emergency.
- If Gemini is unavailable, the alert still sends and the app falls back to safe generic guidance instead of blocking the emergency flow.
- If an alert is triggered by mistake, the sender can cancel/delete their own alert immediately.

**Example scenario this was designed for:** a resident notices WAPDA has cut power to the block — instead of only telling the one or two neighbors they happen to have numbers for, they post it once, and everyone within 1km sees it. The same logic applies to a security concern, a fire, or a medical situation — one alert, the whole real neighborhood, in seconds.

### 🛍️ Neighborhood Marketplace
- Post items to **Sell, Rent, Borrow, or offer as a Service** — chairs and tables for an event, a spare drill machine, a bit of cash to be paid back, medicine someone urgently needs.
- Each listing supports a photo and is geo-filtered to the same 1km radius as the Feed.
- Message the lister directly and privately to work out the details.
- Useful marketplace filters help users narrow results by type, distance, price range, and verified users only.

### 🗺️ Interactive Map View
- Feed, SOS, and the neighborhood views use **Leaflet + OpenStreetMap** — deliberately chosen to avoid any paid Google Maps dependency.
- Posts are plotted as color-coded pins by category (red for Emergency, green for Marketplace, yellow for Lost & Found), so a resident can visually scan what's happening around them rather than scrolling a feed.
- The map now acts as a practical neighborhood layer with simple zone overlays, not just a pin board.

---

## 3. The AI Feature

TribeKnit's AI layer is built on **Google's Gemini API**, called from a custom server-side route (`/api/classify`) with a system prompt written specifically for this app's context — not a generic wrapper.

**What it does today:**

1. **Automatic post classification.** Every post's text is sent to Gemini and classified into one of: `EMERGENCY`, `HELP_REQUEST`, `MARKETPLACE`, `GENERAL`. This runs regardless of which category the user manually selected in the dropdown — so if someone is in genuine distress and simply types "can't breathe, please help" without thinking to change the category dropdown, the AI still recognizes it and re-tags the post as an emergency. Human error at the moment of posting doesn't cost visibility.
2. **AI-drafted response suggestions.** For posts classified as `HELP_REQUEST` or `MARKETPLACE`, Gemini also drafts a short, natural, Urdu-English-mixed reply that a neighbor could send — lowering the effort it takes for someone to actually respond and help.
3. **AI safety guidance for SOS.** The SOS flow can call a second Gemini route (`/api/sos-guidance`) that turns a short emergency description into three immediate safety instructions. These instructions are stored with the alert and displayed to neighbors on the SOS screen.

**The exact system prompt used:**

You are Mohallah Assistant for a Pakistani neighborhood app. Given a post's text,
classify it into exactly one category: EMERGENCY, HELP_REQUEST, MARKETPLACE, or GENERAL.
Then, if category is HELP_REQUEST or MARKETPLACE, write one short polite message
(max 2 sentences, natural Urdu-English mix as Pakistanis speak) that the requester
could send to a neighbor. Return ONLY valid JSON, no markdown, no backticks:
{"category": "...", "suggested_message": "..." or null}

**Model:** `gemini-2.0-flash`

**SOS safety prompt:**

You are a safety assistant for a neighborhood emergency app in Pakistan.
Given a short description of an emergency situation, respond with exactly
3 short, practical, immediate safety instructions (max 10 words each) that
the person reporting AND their nearby neighbors should follow right now.
Prioritize life safety over property. Use plain, calm English.
If the description is empty or unclear, give 3 general emergency-safety
instructions instead. Return ONLY valid JSON, no markdown, no backticks:
{"instructions": ["...", "...", "..."]}

**Design decision — AI is best-effort, not a single point of failure.** If the Gemini API is temporarily rate-limited or unavailable, the post still publishes immediately using the user's manually selected category. The app never breaks or blocks a user because an external AI service is briefly unavailable — this was a deliberate reliability choice given that this is a safety-adjacent app.

For SOS, the same best-effort rule applies: if the AI call fails or times out, the alert still goes out and the app falls back to generic safety guidance.

**Honest note on scope:** the current AI implementation is intentionally scoped to classification and response-drafting, which was the most reliable, testable feature achievable in the project timeline. It is the foundation for a broader AI roadmap (below) rather than the final ceiling of what this app's AI layer will do.

**AI Roadmap (not yet implemented):**
- Computer-vision matching for Lost & Found photos across posts in the same block.
- Automatic clustering/detection when multiple nearby residents report the same issue (e.g., several "no light" posts in a short window flagged as a single area-wide outage).
- Proactive matching — surfacing a "Borrow" request to specific neighbors whose past posts suggest they own the relevant item.

---

## 4. Tools, Services & Technologies Used

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend / Database | Supabase — PostgreSQL, Authentication, Realtime, Storage |
| AI | Google Gemini API (`gemini-2.0-flash`) for post classification, reply suggestions, and SOS safety guidance |
| Maps | Leaflet + OpenStreetMap (free, no API key required) |
| Branding / Logo | Canva |
| Hosting / Deployment | Vercel |
| Email (auth confirmation) | Supabase Auth email + Resend (free tier) |

---

## 5. Supabase's Role & Its Free-Tier Limitations (Transparency Note)

Supabase powers the entire backend of this app: the Postgres database, all authentication, the Realtime channels behind SOS alerts and private messaging, and file storage for post/marketplace photos. Every table (`profiles`, `posts`, `marketplace_items`, `sos_alerts`, `likes`, `comments`, `messages`, `reports`) is protected with Row Level Security policies, so a user can only read or modify data they're actually authorized to touch.

Being built entirely on free tiers, two limitations are worth being upfront about:

- **Email delivery is rate-limited.** Both Supabase's built-in auth email and the free tier of Resend (used for confirmation emails) restrict how many emails can be sent per hour on a free plan, and Resend's free sender can only reliably deliver to the address the account was registered with. This does **not** affect account creation itself, or how many users the app can support — Supabase's free tier supports up to 50,000 users. It only affects *email confirmation speed* during heavy testing.
- **Signup is designed to stay smooth even if location access is blocked.** The app keeps account creation moving so users are not stuck at onboarding just because the browser denied geolocation.
- **To remove any friction for evaluation**, a pre-verified demo account is provided below that bypasses email confirmation entirely, so the app can be used immediately without waiting on any email.

### Demo Account (Recommended for Evaluation)
Email: demo@tribeknit.app
Password: TribeKnit2026

This account is pre-populated with sample posts and marketplace listings and shares its location with existing test data, so real content is visible immediately on login — no empty-feed problem.

---

## 6. Screenshots

*(Add 3–4 screenshots here before submission — Feed, SOS with map, Marketplace, and a post with the AI-suggested reply visible. Example format below.)*

| Feed | SOS Alert + Map | Marketplace |
|---|---|---|
| ![Feed](./screenshots/feed.png) | ![SOS](./screenshots/sos.png) | ![Marketplace](./screenshots/marketplace.png) |

---

## 7. How to Run This Project Locally

```bash
git clone https://github.com/hibahrehman25-lang/neighbours_connect.git
cd neighbours_connect
npm install
```

Create a `.env.local` file in the project root:
