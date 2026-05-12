# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/65b54b40-7dda-4144-9622-4bf933991323

# ✈️ Travel Craft Itinerary

> AI-powered travel booklet generator — turns booking emails and PDFs into branded, ready-to-share itineraries.

![Stack](https://img.shields.io/badge/stack-Next.js%20·%20TypeScript%20·%20Supabase-blue)
![Status](https://img.shields.io/badge/status-active-success)

---

## What it does

Travel agencies and concierges spend hours copy-pasting flight, hotel, and activity details from PDFs and confirmation emails into client documents. This tool automates that.

1. **Drop** booking emails / PDFs into the app
2. **AI parses** them (flights, hotels, transfers, activities, restaurants)
3. **Generates** a clean, branded PDF itinerary the client receives

---

## Stack

- **Frontend** — Next.js + TypeScript + Tailwind
- **Backend** — Supabase (auth, DB, storage)
- **AI** — LLM-based extraction + structured output parsing
- **PDF gen** — [à compléter : ex. react-pdf / Puppeteer]

---

## How it was built

Prototyped on **Lovable** to validate the UX, then ported to a real codebase (VSCode + Claude) once the flow was solid. Built end-to-end as part of **EstuIA**, the GenAI studio I cofounded to ship AI products for small businesses.

---

## Run it locally

```bash
git clone https://github.com/cggailla/travel-craft-itinerary
cd travel-craft-itinerary
npm install
cp .env.example .env.local   # fill in your Supabase + LLM keys
npm run dev
```

Open http://localhost:3000.

---

## Roadmap

- [ ] Multi-language support (FR / EN / ES)
- [ ] Direct Gmail integration (auto-pull bookings)
- [ ] Agency white-label mode

---

## Author

**Côme Gaillard** — LLM Engineer @ Artefact · cofounder @ EstuIA
[LinkedIn](https://www.linkedin.com/in/comegaillard) · comegaillard@gmail.com
