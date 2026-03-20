# Supernote Task Manager — Vercel Edition

A fully standalone task manager that works without any AI agent.  
All data lives in **Turso**, syncs from **Supernote Cloud**, and emails via **Resend**.

## Architecture

```
Supernote Cloud
      ↓ (daily cron, 7:50 AM)
  Vercel API routes
      ↓
  Turso DB  in  React UIn      ↓
  Resend email (daily digest + per-task)
```
