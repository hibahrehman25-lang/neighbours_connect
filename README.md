# TribeKnit

### Connecting Communities. Strengthening Neighborhoods.

A hyperlocal, AI-powered neighborhood safety and community platform built for residential areas in Pakistan.

TribeKnit helps residents connect with verified neighbors living within a **1 km radius**, making it easier to stay informed, request help, respond to emergencies, and build stronger local communities.

**🌐 Live Demo:** https://neighbours-connect-ause.vercel.app

**💻 Source Code:** https://github.com/hibahrehman25-lang/neighbours_connect

---
## Table of Contents
The Problem
Who it's For
Why tribeKnit
Screenshots
Features
AI Features
Future Improvements
Technology Stack
Architecture
How Supabase Powers TribeKnit
Demo Account
Run Locally
License
Acknowledgements
About the Developer

## The Problem

Modern lifestyles have made neighborhoods less connected than ever. Most people barely know the families living around them, even though those same neighbors are often the first people who could help during an emergency.

Whether it's a medical emergency, a theft, a power outage, a lost pet, borrowing household tools, or selling unused items, people usually rely on scattered WhatsApp or Facebook groups that are noisy, unverified, and not location-aware. As a result, nearby residents who could help often never even know someone needs assistance.

**TribeKnit** solves this problem by creating a verified hyperlocal community where residents within a real **1 km radius** can safely communicate, receive real-time alerts, share updates, lend a helping hand, and support one another.


## Who It's For 

For: Residents of neighborhoods and housing societies in Pakistan who don't really know the people living around them and want a safer, faster way to reach help, share alerts, and trade locally without relying on noisy, unverified WhatsApp or Facebook groups.
### Why: 
Because in an actual emergency, the neighbor two houses down can help faster than anyone on the internet TribeKnit just makes sure they know you need it, in real time, and only within a radius that's actually relevant to them.


## 📸 Screenshots
## Signup Page GPS + document verification onboarding
![Map View](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20214225.png)

## login page
![SOS Alert](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20214205.png)

## logo splash screen
![Marketplace](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20214139.png)

## Profile page 
![Post Interaction](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20214019.png)

## SOS Emergency Button - alarm + notification
![Neighborhood Feed](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213904.png)

## sos live map 
![Private Messaging](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213839.png)

## Market Place with price filters 
![Nearby Search](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213738.png)

## Ai based suggestion for comments and natural language understanding plus post page automatically cateogry selected based upon message nature
![Marketplace Filters](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213603.png)

## Feed dashboard
![Create Post](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213408.png)

# Private Chat interface 
![Map View 2](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213253.png)

## Feed Map View
![Map View](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20213214.png)

## Show Image	Edit/Delete Post & Comments
![Map View](https://github.com/hibahrehman25-lang/neighbours_connect/blob/main/Screenshot%202026-07-26%20223452.png)

---

# Features

## Verified Resident Accounts

* Email & password authentication using Supabase Auth
* GPS-based location captured during signup
* Identity document upload for resident verification
* Verified Resident badge for trusted community members
* Graceful signup flow even if location permission is denied

---

## Hyperlocal Feed

Residents can share updates that are only visible to neighbors within **1 km**.

Features include:

* Photo attachments
* Likes and comments
* Edit and delete comments
* Delete your own posts
* Report inappropriate posts
* Search nearby residents
* Start private real-time conversations without exchanging phone numbers

---

## Interactive Neighborhood Map

Instead of a traditional social feed, TribeKnit opens with a live neighborhood map.

Using **Leaflet** and **OpenStreetMap**, posts are displayed as color-coded markers, allowing residents to instantly understand what is happening nearby.

Users can switch between:

* 🗺️ Map View
* 📋 List View

No paid Google Maps API is required.

---

## SOS Emergency Alerts

Residents can instantly notify nearby neighbors during emergencies using a dedicated SOS button.

Features include:

* One-tap SOS alerts
* Real-time delivery using Supabase Realtime
* Browser notifications
* Audible emergency alerts
* Live map location
* Cancel accidental alerts
* AI-generated emergency safety guidance

---

## Neighborhood Marketplace

Residents can buy, sell, rent, borrow, or offer services within their local community.

Marketplace supports:

* Product photos
* Distance filtering
* Price filtering
* Category filtering
* Direct messaging with sellers

---

# AI Features

TribeKnit uses **Google Gemini 2.0 Flash** through two custom API routes to improve safety and user experience.

## AI Post Classification

Every new post is analyzed by Gemini and automatically classified into one of four categories:

* Emergency
* Help Request
* Marketplace
* General

This helps prevent important posts from being incorrectly categorized by users.

For **Help Request** and **Marketplace** posts, Gemini also generates a short Urdu-English reply suggestion, making it easier for neighbors to respond quickly.

### System Prompts used
You are a classification assistant for a hyperlocal neighborhood app called TribeKnit.

Read the user's post content below and classify it into EXACTLY ONE of these
four categories: "emergency", "help_request", "marketplace", "general".

Rules:
- "emergency": fire, medical crisis, security threat, accident, or anything
  requiring immediate neighbor attention.
- "help_request": non-urgent requests for assistance, borrowing items,
  lost & found, favors.
- "marketplace": buying, selling, renting, or offering goods/services.
- "general": community updates, announcements, casual conversation.

If the category is "help_request" or "marketplace", also generate a short,
natural reply suggestion a neighbor could send back, written in a casual
mix of Urdu and English (Roman Urdu), under 20 words.

Respond ONLY in this JSON format, with no extra text:
{
  "category": "<emergency|help_request|marketplace|general>",
  "reply_suggestion": "<string or null>"
}

Post content: "{{post_text}}"
---

## AI SOS Safety Guidance

Before sending an SOS alert, users can optionally describe the emergency.

Gemini generates **three short, situation-specific safety instructions** that are attached to the alert and shown to nearby residents.

Examples include guidance for:

* Fire
* Medical emergencies
* Security incidents
* Power outages
* General emergencies

### System prompt
You are an emergency safety assistant for a neighborhood alert system called
TribeKnit. A resident has triggered an SOS alert and optionally described
their situation below.

Generate exactly THREE short, clear, actionable safety instructions
(each under 15 words) that nearby residents and the person in danger can
follow immediately. Prioritize physical safety, calling professional
emergency services, and simple first steps.

Do not diagnose medical conditions. Do not give instructions requiring
specialized equipment. Keep language simple and calm.

Respond ONLY as a JSON array of exactly 3 strings, no extra text:
["instruction 1", "instruction 2", "instruction 3"]

Situation description: "{{situation_text}}"
(If empty, provide general emergency guidance.)
---

## Reliability First

Since TribeKnit is designed for real emergency situations, AI is treated as an enhancement—not a dependency.

If Gemini is temporarily unavailable or reaches its free-tier limits:

* Posts are still published successfully.
* SOS alerts are still sent immediately.
* The application automatically falls back to safe default emergency guidance.

This ensures that an external AI outage never delays an emergency alert.

---

# Future Improvements

Planned features include:

* Computer vision matching for Lost & Found photos
* Automatic clustering of similar neighborhood incidents
* Google Maps API integration for advanced visualization
* Color-coded live alert zones on the map
* Smarter AI recommendations for borrowing and lending nearby items
* Push notifications for mobile devices
* Admin dashboard for manual resident verification

---

# Technology Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend        | Supabase                                          |
| Database       | PostgreSQL                                        |
| Authentication | Supabase Auth                                     |
| Realtime       | Supabase Realtime                                 |
| Storage        | Supabase Storage                                  |
| AI             | Google Gemini 2.0 Flash                           |
| Maps           | Leaflet + OpenStreetMap                           |
| Deployment     | Vercel                                            |
| Branding       | Canva                                             |

---

# Architecture
┌─────────────────────┐
│   User's Browser     │
│  (Next.js 16 Client) │
└──────────┬───────────┘
           │  HTTPS
           ▼
┌─────────────────────────────┐
│   Next.js App Router         │
│   (Frontend + API Routes)    │
│                               │
│  /api/classify-post  ───────┼───┐
│  /api/sos-guidance   ───────┼───┤
└──────────┬────────────────┬──┘   │
           │                │      ▼
           │                │  ┌────────────────────┐
           │                │  │  Google Gemini 2.0   │
           │                │  │  Flash (AI layer)    │
           │                │  └────────────────────┘
           ▼                ▼
┌─────────────────────────────────────┐
│              Supabase                │
│  ┌───────────┐ ┌────────────────┐    │
│  │   Auth    │ │  PostgreSQL DB  │    │
│  └───────────┘ │  + Row Level    │    │
│  ┌───────────┐ │  Security (RLS) │    │
│  │  Realtime │ └────────────────┘    │
│  │ (SOS/chat)│ ┌────────────────┐    │
│  └───────────┘ │    Storage      │    │
│                │ (photos/docs)   │    │
│                └────────────────┘    │
└─────────────────────────────────────┘
           ▲
           │  Map tiles (no API key)
┌──────────┴───────────┐
│  Leaflet + OpenStreetMap │
└─────────────────────────┘

# How Supabase Powers TribeKnit

Supabase serves as the complete backend for the application.

It is responsible for:

* User authentication
* PostgreSQL database
* Realtime messaging
* SOS alert broadcasting
* Private chat
* File storage
* Row Level Security (RLS)

Every major table—including profiles, posts, comments, marketplace listings, messages, likes, reports, and SOS alerts—is protected using Row Level Security policies to ensure users can only access data they are authorized to view.

### Free Tier Note

This project is built entirely using Supabase's free tier.

During heavy testing, confirmation emails may occasionally be delayed due to free-tier email rate limits. This limitation only affects email delivery and does not impact the application's core functionality.

To simplify evaluation, a pre-verified demo account is provided below.

---

# Demo Account

**Email**

[demo@tribeknit.app](mailto:demo@tribeknit.app)

**Password**

TribeKnit2026

The demo account already contains sample posts, marketplace listings, and nearby users, allowing evaluators to explore the application immediately after logging in.

To test private messaging, search for **Hibah Rehman** from the neighborhood search bar and start a real-time conversation.

---

# Project Structure

Clone the repository:

```bash
git clone https://github.com/hibahrehman25-lang/neighbours_connect.git

cd neighbours_connect

npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

Run locally:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

No API keys or secrets are stored in the repository.

---

# Project Links

**Live Application**

https://neighbours-connect-ause.vercel.app

**GitHub Repository**

https://github.com/hibahrehman25-lang/neighbours_connect

---
# License

This project is licensed under the MIT License — feel free to fork and build on it.

# Acknowledgements

Special thanks to the teams behind the amazing free tools that made this project possible:

* Supabase
* Google Gemini
* Leaflet
* OpenStreetMap
* Vercel
* Canva

---

# About the Developer

**Hibah Rehman**

Computer Science student at the **University of Veterinary and Animal Sciences (UVAS), Lahore** *(2024–2028)*.

An AI and Machine Learning enthusiast with a strong interest in Natural Language Processing, Computer Vision, and Deep Learning.

Currently completing an AI internship at **FlyRank AI**.

This project was designed, developed, and deployed independently as the final submission for the **ACT AI – Ship Your AI App** program.

**GitHub**

https://github.com/hibahrehman25-lang

**LinkedIn**

https://www.linkedin.com/in/hiba-rehman-tech
