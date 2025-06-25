
# Float 30 Restaurant Reservation System

A production-ready reservation system built with Next.js, Supabase, and modern web technologies. This system provides a complete solution for restaurant reservations with customer booking, email confirmations, and admin management.

## 🍽️ Features

### Customer Features

* **Online Reservations** : Easy-to-use booking form
* **Real-time Availability** : Check available time slots
* **Email Confirmations** : Automatic confirmation emails
* **Mobile Responsive** : Works perfectly on all devices
* **Validation** : Comprehensive form validation and error handling

### Admin Features

* **Dashboard** : Complete reservation management interface
* **Status Management** : Update reservation status (confirmed, completed, cancelled, no-show)
* **Filtering & Search** : Filter by date, status, and other criteria
* **CSV Export** : Export reservations for external analysis
* **Real-time Updates** : Live reservation tracking

### Technical Features

* **Rate Limiting** : Prevents abuse and spam
* **Security** : Input sanitization and SQL injection protection
* **Performance** : Optimized for speed and scalability
* **Accessibility** : WCAG compliant design
* **SEO Optimized** : Meta tags and structured data

## 🛠️ Tech Stack

* **Frontend** : Next.js 14, React, TypeScript, Tailwind CSS
* **Backend** : Next.js API Routes, Supabase
* **Database** : PostgreSQL (via Supabase)
* **Email** : Resend API
* **Deployment** : Vercel
* **Validation** : Zod
* **Forms** : React Hook Form
* **UI Components** : Lucide React Icons, React Hot Toast

## 🚀 Quick Start

### Prerequisites

* Node.js 18+
* npm or yarn
* Supabase account
* Resend account (for emails)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd float30-reservations
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Restaurant Info
RESTAURANT_EMAIL=float30reservations@gmail.com
RESTAURANT_NAME=Float 30 Restaurant
RESTAURANT_PHONE=+1-555-123-4567

# Admin
ADMIN_PASSWORD=your_secure_password
```

4. **Set up the database**

* Create a new Supabase project
* Run the SQL from** **`database/schema.sql` in the Supabase SQL editor

5. **Start development server**

```bash
npm run dev
```

Visit** **`http://localhost:3000` to see the application.

## 📁 Project Structure

```
float30-reservations/
├── app/                          # Next.js 13+ App Router
│   ├── admin/                    # Admin dashboard pages
│   ├── api/                      # API routes
│   │   ├── reservations/         # Reservation CRUD operations
│   │   └── admin/                # Admin authentication & operations
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main reservation page
├── components/                   # Reusable React components
│   └── ReservationForm.tsx       # Main reservation form
├── lib/                          # Utility libraries
│   ├── supabase.ts              # Database client & operations
│   ├── email.ts                 # Email service (Resend)
│   └── validation.ts            # Form validation schemas
├── types/                        # TypeScript type definitions
│   └── supabase.ts              # Database types
├── utils/                        # Utility functions
│   └── rate-limit.ts            # Rate limiting middleware
├── database/                     # Database schema and migrations
│   └── schema.sql               # Database schema
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── next.config.js               # Next.js configuration
├── DEPLOYMENT.md                # Detailed deployment guide
└── README.md                    # This file
```

## 🗄️ Database Schema

The system uses PostgreSQL with the following main tables:

### `reservations`

* Customer reservation data
* Date, time, party size
* Status tracking
* Special requests

### `restaurant_settings`

* Configurable restaurant settings
* Opening hours, capacity limits
* Closed days configuration

### Views & Functions

* `available_slots` view for real-time availability
* Automatic timestamp updates
* Row Level Security (RLS) policies

## 🔧 Configuration

### Restaurant Settings

The system includes configurable settings stored in the database:

* **Opening Hours** : Default 5:00 PM - 10:00 PM
* **Closed Days** : Default Monday
* **Advance Booking** : Up to 30 days
* **Slot Duration** : 15-minute intervals
* **Max Party Size** : 10 people (11+ requires phone call)
* **Tables** : Configurable capacity

### Rate Limiting

Default rate limits:

* Reservations: 5 per 15 minutes per IP
* Availability checks: 30 per 15 minutes per IP
* Admin operations: 100 per 15 minutes per IP

## 📧 Email Templates

The system includes professional email templates:

### Customer Confirmation

* Reservation details
* Important policies
* Contact information
* Mobile-responsive design

### Restaurant Notification

* New reservation alert
* Customer information
* Special requests highlighting

### Cancellation Email

* Cancellation confirmation
* Future booking invitation

## 🔐 Security Features

* **Input Validation** : All inputs validated with Zod schemas
* **SQL Injection Protection** : Parameterized queries via Supabase
* **Rate Limiting** : Prevents abuse and spam
* **CSRF Protection** : Built into Next.js
* **Environment Variables** : Secure configuration management
* **Row Level Security** : Database-level access control

## 🎨 Customization

### Styling

* Built with Tailwind CSS
* Fully customizable color scheme
* Responsive design system
* Custom components in** **`globals.css`

### Business Logic

* Restaurant hours in database settings
* Closed days configuration
* Capacity management
* Custom validation rules

### Email Branding

* Customizable templates in** **`lib/email.ts`
* Restaurant branding integration
* Multi-format support (HTML + plain text)

## 📱 Mobile Support

* Fully responsive design
* Touch-friendly interface
* Progressive Web App ready
* iOS/Android compatible

## 🔍 SEO & Performance

* Server-side rendering
* Optimized meta tags
* Structured data markup
* Image optimization
* Code splitting
* Edge caching

## 🧪 Testing

### Manual Testing Checklist

**Reservation Flow:**

* [ ] Form validation works
* [ ] Email confirmation sent
* [ ] Database entry created
* [ ] Admin notification sent

**Admin Dashboard:**

* [ ] Authentication working
* [ ] Reservations display correctly
* [ ] Status updates function
* [ ] CSV export works

**Error Handling:**

* [ ] Invalid input handled gracefully
* [ ] Network errors handled
* [ ] Database connection failures handled

## 🚀 Deployment

See** **[DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy to Vercel

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically

### Database Deployment

1. Create Supabase project
2. Run schema from** **`database/schema.sql`
3. Configure RLS policies

## 📊 Monitoring

### Performance Monitoring

* Vercel Analytics integration
* Core Web Vitals tracking
* API response time monitoring

### Error Tracking

* Built-in error logging
* Email delivery monitoring
* Database performance tracking

## 🔄 Maintenance

### Regular Tasks

* Monitor email delivery rates
* Check database performance
* Review reservation patterns
* Update dependencies

### Backup Strategy

* Automatic Supabase backups
* Environment variable backup
* Code repository backup

## 🆘 Troubleshooting

### Common Issues

**Email not sending:**

* Check Resend API key
* Verify domain settings
* Review email logs

**Database connection:**

* Verify Supabase credentials
* Check RLS policies
* Review network connectivity

**Form validation:**

* Check Zod schema
* Verify input formats
* Review error messages

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For support and questions:

* Check the troubleshooting section
* Review the deployment guide
* Create an issue on GitHub

## 🎯 Roadmap

### Phase 2 Features (Future)

* [ ] SMS notifications
* [ ] Table management system
* [ ] Waitlist functionality
* [ ] Multi-location support
* [ ] Calendar integration
* [ ] Customer profiles
* [ ] Loyalty program integration
* [ ] Analytics dashboard
* [ ] API for third-party integrations

---

**Built with ❤️ for Float 30 Restaurant**

Ready to deploy? See** **[DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions!
