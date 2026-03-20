# Coolify Production Deployment Guide for journalslibrary.com

This guide contains everything you need to deploy the Aether LMS platform onto Coolify pointing to your production domain: `journalslibrary.com`.

## Prerequisites Structure
You have a 3-tier microservice architecture natively supported by the root `docker-compose.yml`:
1. **Frontend** (Next.js - Port 3000)
2. **Backend** (Go HTTP Server - Port 8080)
3. **AI Engine** (FastAPI - Port 8000)
4. **Database** (PostgreSQL)

---

## 🚀 Step 1: Connect your Git Repository in Coolify

1. Log in to your Coolify dashboard.
2. Click **Create New Resource** ➔ **Application** ➔ **Public / Private Repository** (depending on your Github setup).
3. Connect your Git provider and select this repository.

---

## 📦 Step 2: Configure the Service Setup
When Coolify detects your repository, it will ask how to build it. Since we are using a **mono-repo with orchestrations**, select:

- **Build Pack:** `Docker Compose`
- Coolify will automatically detect the `docker-compose.yml` file in the root.

### Environment Secrets Configuration
Before clicking "Deploy", go to the **Environment Variables** tab in Coolify and input the following required keys:

```bash
# Database Secrets (Matched implicitly by Compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=aether_lms

# Security Array
APP_ENV=production
JWT_SECRET=your_super_strong_production_jwt_secret
APP_BASE_URL=https://journalslibrary.com
NEXT_PUBLIC_API_URL=https://api.journalslibrary.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_yourkeyhere
TRUSTED_PROXIES=127.0.0.1,::1

# Razorpay Production Keys
RAZORPAY_KEY_ID=rzp_live_yourkeyhere
RAZORPAY_KEY_SECRET=your_rzp_live_secret
RAZORPAY_WEBHOOK_SECRET=your_rzp_webhook_secret
LEAD_WEBHOOK_URL=https://your-crm.example.com/webhooks/leads
LEAD_WEBHOOK_SECRET=your_crm_webhook_secret
LEAD_COMPANY_ID=your_company_id

# AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
```
*(Save the variables)*.

---

## 🌍 Step 3: Domain Routing Configuration

Coolify will expose your services internally. You need to assign the correct subdomains to the services running on their specific ports.

Navigate to the generated Services section in your Coolify Dashboard:

1. **Frontend Service (`frontend`)**:
   - Add Domain: `https://journalslibrary.com`
   - Add Domain: `https://www.journalslibrary.com`
   - *Internal Port:* `3000`

2. **Backend Service (`backend`)**:
   - Add Domain: `https://api.journalslibrary.com`
   - *Internal Port:* `8080`
   - Next.js will use this endpoint globally from the `NEXT_PUBLIC_API_URL` variable.

3. **AI Engine (`ai-engine`)**:
   - This service stays fully internalized by default! The Go backend speaks to it via `http://ai-engine:8000`. No external domain is necessary.

---

## ⚡ Step 4: First Time Deployment & Migrations

1. Click **Deploy**.
2. Coolify will fetch the standard optimized `Dockerfile`s generated for `frontend`, `backend-go`, and `ai-engine-py`. This will take several minutes to build correctly the first time.
3. The backend now applies embedded versioned SQL migrations on startup when `RUN_MIGRATIONS=true`, so the database schema is created and upgraded in a controlled way instead of relying on GORM `AutoMigrate`.
4. If your production database already existed before this migration system was introduced, set `BASELINE_EXISTING_SCHEMA=true` for the first deploy only. This records the baseline migration without replaying it over the live schema. After the deployment succeeds, set it back to `false`.

### Seed The Database (First Time Only!)
The backend automatically seeds the initial `super_admin` account on first boot using:

- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

Set both to strong production values before deployment. No separate `seed.go` step is required.

🎉 **Finished! You are live natively at `journalslibrary.com`.**
