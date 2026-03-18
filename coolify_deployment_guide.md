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
JWT_SECRET=your_super_strong_production_jwt_secret

# Razorpay Production Keys
RAZORPAY_KEY_ID=rzp_live_yourkeyhere
RAZORPAY_KEY_SECRET=your_rzp_live_secret
RAZORPAY_WEBHOOK_SECRET=your_rzp_webhook_secret

# AI
ANTHROPIC_API_KEY=sk-ant-yourkey
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
3. Because Go automatically bootstraps `GORM` schema migrations, the database will correctly build out tables immediately when the Backend starts up.

### Seed The Database (First Time Only!)
Once deployment completes, the server lacks an initial Admin user to map access to. 

Run this command inside the `backend` Docker container shell (accessible directly via the Coolify Terminal console for the backend service):

```bash
go run seed.go
```
This will inject the initial courses, default catalog, and generate an Admin account:
- **Email:** admin@example.com / **Password:** admin123  *(You should log in immediately and change this via the DB or the dashboard if available).*

🎉 **Finished! You are live natively at `journalslibrary.com`.**
