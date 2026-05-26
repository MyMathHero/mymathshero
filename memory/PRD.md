# EduAdapt — AI-Powered Adaptive Learning Platform

## Overview
EduAdapt is a multi-page web application for an AI-powered adaptive learning platform targeting Australian primary school students (K-5) covering Mathematics, English/Literacy, and Science.

## Brand
- **Name:** EduAdapt
- **Tagline:** "Every Child Learns Differently. Now Their Education Does Too."
- **Logo:** Text-based — "Edu" in white bold + "Adapt" in electric blue bold, inside a navy rounded rectangle
- **Colors:** Navy #1B3A6B, Electric Blue #2563EB, Sky Blue #DBEAFE, Success Green #16A34A, Warning Amber #D97706, Off White #F8FAFC, Dark Slate #1E293B
- **Font:** DM Sans

## Pages
1. **Landing Page** (/) — Hero, stats bar, features, how it works, subjects, testimonials, waitlist form, footer
2. **For Schools** (/for-schools) — Hero, pain points, solutions, pricing, demo form modal, trust bar
3. **How It Works** (/how-it-works) — Detailed 3-step process, SmartScore, skill tree, AI engine, for students/teachers/parents sections
4. **Student Dashboard** (/student-dashboard) — Subject selector, skill cards, practice modal with Q&A, progress panel, badges, daily goals
5. **Teacher Dashboard** (/teacher-dashboard) — Class overview, skill heatmap, AI insights, student detail sidebar

## Backend API Endpoints
- `POST /api/waitlist` — Store waitlist signups (name, email, role) in MongoDB
- `GET /api/waitlist` — Retrieve all waitlist entries
- `POST /api/demo-request` — Store demo requests (name, school_name, role, email, phone) in MongoDB
- `GET /api/demo-request` — Retrieve all demo requests

## Tech Stack
- **Frontend:** Next.js 14, React 18, Tailwind CSS, shadcn/ui, Lucide React
- **Backend:** Next.js API Routes
- **Database:** MongoDB
- **Font:** DM Sans (Google Fonts)
