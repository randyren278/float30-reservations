# Float 30 Restaurant Reservation System - Deployment Guide

This guide walks you through deploying the Float 30 Restaurant reservation system to production using Vercel and Supabase.

## Prerequisites

Before you begin, ensure you have:

* Node.js 18+ installed
* Git installed
* A Vercel account (free tier is sufficient)
* A Supabase account (free tier is sufficient)
* A Resend account for email services (free tier available)
* Access to your domain DNS settings

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to** **[Supabase](https://supabase.com/) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   * **Name** :** **`float30-reservations`
   * **Database Password** : Generate a strong password and save it
   * **Region** : Choose closest to your users (e.g.,** **`us-west-1` for Vancouver)
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

### 2. Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the entire contents of** **`database/schema.sql` from this project
3. Paste it into the SQL Editor and click "Run"
4. Verify tables were created by checking the Table Editor

### 3. Configure Row Level Security (RLS)

The schema already includes RLS policies, but verify they're active:

1. Go to Authentication → Policies
2. Ensure policies are listed for both** **`reservations` and** **`restaurant_settings` tables

### 4. Get Supabase Credentials

1. Go to Settings → API
2. Copy these values for later:
   * **Project URL** (starts with** **`https://`)
   * **Project API Key** (anon/public key)
   * **Service Role Key** (keep this secret!)

## 📧 Email Setup (Resend)

### 1. Create Resend Account

1. Go to** **[Resend](https://resend.com/) and sign up
2. Verify your email address

### 2. Add Domain (Recommended)

For production, add your domain:

1. Go to Domains → Add Domain
2. Enter your domain (e.g.,** **`float30restaurant.com`)
3. Add the required DNS records to your domain provider
4. Wait for verification (can take up to 24 hours)

### 3. Get API Key

1. Go to API Keys
2. Click "Create API Key"
3. Name it** **`Float30 Reservations`
4. Copy the API key for later

### 4. Set Up Sender Email

If using your own domain:

* Sender email format:** **`reservations@yourdomain.com`
* Make sure the domain is verified in Resend

If using Resend's domain (for testing):

* Use:** **`onboarding@resend.dev` (limited to your registered email)

## 🚀 Deployment (Vercel)

### 1. Prepare Your Repository

1. Clone or fork this repository
2. Make sure all files are committed to Git
3. Push to GitHub/GitLab/Bitbucket

### 2. Deploy to Vercel

1. Go to** **[Vercel](https://vercel.com/) and sign up/login
2. Click "Import Project"
3. Import your repository
4. Configure the project:
   * **Framework Preset** : Next.js
   * **Build Command** :** **`npm run build`
   * **Output Directory** :** **`.next`
   * **Install Command** :** **`npm install`

### 3. Configure Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
RESEND_API_KEY=re_your-api-key

# Restaurant Configuration
RESTAURANT_EMAIL=float30reservations@gmail.com
RESTAURANT_NAME=Float 30 Restaurant
RESTAURANT_PHONE=+1-555-123-4567

# Admin Configuration
ADMIN_PASSWORD=your-secure-admin-password-here

# Security
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=900000
```

### 4. Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Test the deployment URL

## 🔗 Custom Domain Setup

### 1. Add Domain to Vercel

1. In Vercel dashboard, go to Settings → Domains
2. Add your domain (e.g.,** **`reservations.float30restaurant.com`)
3. Configure DNS records as instructed

### 2. DNS Configuration

Add these DNS records to your domain provider:

**For subdomain (recommended):**

```
Type: CNAME
Name: reservations
Value: cname.vercel-dns.com
```

**For root domain:**

```
Type: A
Name: @
Value: 76.76.19.61

Type: AAAA  
Name: @
Value: 2600:1f18:22ba:e400::2
```

### 3. SSL Certificate

Vercel automatically provisions SSL certificates. Verify:

1. Go to your domain in browser
2. Check for valid HTTPS
3. May take up to 24 hours for DNS propagation

## 🔐 Security Configuration

### 1. Environment Variables Security

* Never commit** **`.env` files to Git
* Use strong, unique passwords
* Rotate secrets regularly
* Use different secrets for staging/production

### 2. Admin Password

Set a strong admin password:

```bash
# Generate a strong password
openssl rand -base64 32
```

### 3. Rate Limiting

Default limits are set for:

* 5 reservations per 15 minutes per IP
* 30 availability checks per 15 minutes per IP
* 5 admin login attempts per 15 minutes per IP

Adjust in environment variables as needed.

## 📊 Monitoring & Maintenance

### 1. Vercel Analytics

Enable in Vercel dashboard:

1. Go to Analytics tab
2. Enable analytics
3. Monitor traffic and performance

### 2. Supabase Monitoring

Monitor in Supabase dashboard:

1. Database → Logs for query performance
2. Database → Usage for storage metrics
3. API → Logs for API usage

### 3. Email Monitoring

Monitor in Resend dashboard:

1. Check delivery rates
2. Monitor bounce/complaint rates
3. Review email logs

## 🧪 Testing Deployment

### 1. Basic Functionality Test

1. Visit your deployed URL
2. Fill out reservation form
3. Submit reservation
4. Check for confirmation email
5. Verify reservation appears in admin dashboard

### 2. Admin Dashboard Test

1. Go to** **`/admin`
2. Log in with admin password
3. Verify reservations appear
4. Test status updates
5. Test CSV export

### 3. Load Testing (Optional)

Use tools like:

* Vercel's built-in analytics
* Google PageSpeed Insights
* GTmetrix

## 🔧 Troubleshooting

### Common Issues

**1. Environment Variables Not Working**

* Ensure variables are set in Vercel dashboard
* Redeploy after adding variables
* Check variable names match exactly

**2. Database Connection Issues**

* Verify Supabase URL and keys
* Check RLS policies are enabled
* Ensure tables exist

**3. Email Not Sending**

* Verify Resend API key
* Check domain verification status
* Review Resend logs

**4. Admin Login Not Working**

* Check admin password in environment variables
* Clear browser cache/cookies
* Verify password encoding

### Logs and Debugging

**Vercel Logs:**

1. Go to your project in Vercel
2. Click on a deployment
3. View "Functions" tab for server logs

**Supabase Logs:**

1. Go to Database → Logs
2. Filter by severity
3. Check for SQL errors

**Browser Console:**

1. Open browser dev tools
2. Check Console for JavaScript errors
3. Check Network tab for API failures

## 📈 Performance Optimization

### 1. Vercel Optimizations

* Enable Edge Functions for better performance
* Use Image Optimization for any restaurant photos
* Enable Compression

### 2. Database Optimizations

* Indexes are already created in schema
* Monitor slow queries in Supabase
* Consider upgrading Supabase plan for high traffic

### 3. Caching Strategy

* API responses are cached by default
* Static assets cached via Vercel CDN
* Database queries optimized with proper indexes

## 🔄 Updates and Maintenance

### 1. Deploying Updates

1. Make changes to your code
2. Commit and push to Git
3. Vercel automatically deploys
4. Test changes on deployment

### 2. Database Migrations

For schema changes:

1. Test changes in Supabase SQL editor
2. Apply to production database
3. Update TypeScript types if needed

### 3. Backup Strategy

* Supabase automatically backs up your database
* Export reservation data regularly via admin dashboard
* Keep environment variables backed up securely

## 📞 Support

### Resources

* **Vercel Docs** : https://vercel.com/docs
* **Supabase Docs** : https://supabase.com/docs
* **Resend Docs** : https://resend.com/docs
* **Next.js Docs** : https://nextjs.org/docs

### Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in respective platforms
3. Consult platform documentation
4. Contact platform support if needed

---

## ✅ Post-Deployment Checklist

* [ ] Database schema created successfully
* [ ] Environment variables configured
* [ ] Custom domain working with SSL
* [ ] Email sending functionality working
* [ ] Admin dashboard accessible
* [ ] Reservation form working end-to-end
* [ ] Mobile responsiveness tested
* [ ] Performance tested
* [ ] Monitoring enabled
* [ ] Backup strategy in place

Your Float 30 Restaurant reservation system is now live! 🎉
