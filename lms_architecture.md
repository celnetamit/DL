# Project Specification: Advanced AI-Powered LMS Platform

## 1. System Role & Objective
**Role:** You are an Expert Full-Stack Developer and AI Architect.
**Objective:** Build a scalable, highly advanced Learning Management System (LMS) with autonomous AI content curation, intelligent user management, and seamless subscription handling via Razorpay.

## 2. Technology Stack & Environment
* **Frontend:** Next.js (App Router, Tailwind CSS, TypeScript) for SEO and fast rendering.
* **Core Backend (Auth, Users, Subscriptions):** Golang (Gin/Fiber) for high concurrency and fast API responses.
* **AI & Data Engine:** Python (FastAPI, LangChain, BeautifulSoup/Scrapy) for web scraping, data processing, and LLM integrations.
* **Database:** PostgreSQL (Relational data) & Redis (Caching and rate limiting).
* **Deployment Environment:** Ubuntu server.

## 3. Core Modules & Feature Requirements

### A. Authentication & User Management (Golang)
* **Roles:** Super Admin, Content Creator/Instructor, Student.
* **Features:** JWT-based authentication, profile management, and role-based access control (RBAC).
* **AI Integration:** Analyze user login patterns and learning behaviors to flag inactive users or suggest personalized learning paths.

### B. Subscription Management & Payment Gateway (Golang + Razorpay)
* **Integration:** Implement Razorpay API for one-time purchases and recurring subscriptions.
* **Features:** Webhook handling for successful/failed payments, invoice generation, and automated tier downgrades on payment failure.
* **AI Integration (Churn Prediction):** Analyze user engagement to predict subscription cancellations. Automatically trigger discount/retention emails for high-risk users.

### C. Core LMS & Content Delivery (Next.js + Golang)
* **Features:** Video player integration, module/lesson structuring, progress tracking (e.g., 40% completed), and quiz assessments.
* **State Management:** Track where a user left off in a video/document and sync across devices.

### D. Smart AI Content Engine (Python Microservice)
* **Auto-Data Collection:** Build web scrapers to gather reliable, real-time educational data from trusted open-source platforms or APIs.
* **AI Curation:** Use an LLM to automatically filter, verify, and format the scraped data into readable study materials or course modules.
* **Auto-Generation:** Automatically generate quizzes, summaries, and flashcards from video transcripts or textual content.
* **Communication:** The Python microservice will expose endpoints that the Golang backend or Next.js frontend will consume.

## 4. Execution Plan (Step-by-Step Directives for AI Agent)

Please execute the development in the following strict phases. Do not move to the next phase until the current one is fully functional and tested.

* **Phase 1: Project Initialization & Database Setup**
  * Set up the Git repository structure for microservices (`/frontend`, `/backend-go`, `/ai-engine-py`).
  * Write the PostgreSQL schema for Users, Subscriptions, Courses, and Progress.
* **Phase 2: Core Backend & Auth (Golang)**
  * Implement user registration, login, and JWT middleware.
  * Build basic CRUD APIs for user profiles.
* **Phase 3: Subscriptions (Razorpay)**
  * Integrate Razorpay order creation and webhook verification APIs.
  * Link successful payments to user database records.
* **Phase 4: AI Data Engine (Python)**
  * Create the web scraping scripts.
  * Integrate the LLM prompt chain to summarize and format the collected data.
  * Expose an endpoint `/api/v1/generate-course-material`.
* **Phase 5: Frontend Interface (Next.js)**
  * Build the UI for the user dashboard, course catalog, and video/content player.
  * Connect frontend to Golang and Python APIs.

## 5. Coding Guidelines
* Write clean, modular, and extensively documented code.
* Ensure all API endpoints have proper error handling and return standardized JSON responses.
* Use environment variables (`.env`) for all sensitive credentials (Razorpay keys, DB URIs, LLM API keys).
* Provide instructions for setting up and running the code on an Ubuntu environment.