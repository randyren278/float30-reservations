import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { Reservation } from '@/types/supabase'

const resend = new Resend(process.env.RESEND_API_KEY!)

const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL || 'float30reservations@gmail.com'
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Float 30 Restaurant'
const RESTAURANT_PHONE = process.env.RESTAURANT_PHONE || '+1-555-123-4567'

// Customer confirmation email template
const getCustomerConfirmationEmail = (reservation: Reservation) => {
  const date = format(parseISO(reservation.reservation_date), 'EEEE, MMMM do, yyyy')
  const time = format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')
  
  return {
    subject: `Reservation Confirmed - ${RESTAURANT_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${RESTAURANT_NAME}</h1>
              <p>Your Reservation is Confirmed!</p>
            </div>
            
            <div class="content">
              <p>Dear ${reservation.name},</p>
              
              <p>Thank you for choosing ${RESTAURANT_NAME}! We're excited to host you and your party.</p>
              
              <div class="details">
                <h3>Reservation Details</h3>
                <div class="detail-row">
                  <strong>Date:</strong>
                  <span>${date}</span>
                </div>
                <div class="detail-row">
                  <strong>Time:</strong>
                  <span>${time}</span>
                </div>
                <div class="detail-row">
                  <strong>Party Size:</strong>
                  <span>${reservation.party_size} ${reservation.party_size === 1 ? 'person' : 'people'}</span>
                </div>
                <div class="detail-row">
                  <strong>Confirmation #:</strong>
                  <span>${reservation.id.substring(0, 8).toUpperCase()}</span>
                </div>
                ${reservation.special_requests ? `
                <div class="detail-row">
                  <strong>Special Requests:</strong>
                  <span>${reservation.special_requests}</span>
                </div>
                ` : ''}
              </div>
              
              <h3>Important Information</h3>
              <ul>
                <li>Please arrive on time. We may not be able to hold your table if you're more than 15 minutes late.</li>
                <li>If you need to modify or cancel your reservation, please call us at ${RESTAURANT_PHONE}.</li>
                <li>We look forward to providing you with an exceptional dining experience!</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="tel:${RESTAURANT_PHONE}" class="button">Call Restaurant</a>
              </div>
            </div>
            
            <div class="footer">
              <p>${RESTAURANT_NAME}<br>
              Phone: ${RESTAURANT_PHONE}<br>
              Email: ${RESTAURANT_EMAIL}</p>
              
              <p><small>This is an automated confirmation email. Please do not reply to this message.</small></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Reservation Confirmed - ${RESTAURANT_NAME}

Dear ${reservation.name},

Thank you for choosing ${RESTAURANT_NAME}! We're excited to host you and your party.

Reservation Details:
- Date: ${date}
- Time: ${time}
- Party Size: ${reservation.party_size} ${reservation.party_size === 1 ? 'person' : 'people'}
- Confirmation #: ${reservation.id.substring(0, 8).toUpperCase()}
${reservation.special_requests ? `- Special Requests: ${reservation.special_requests}` : ''}

Important Information:
- Please arrive on time. We may not be able to hold your table if you're more than 15 minutes late.
- If you need to modify or cancel your reservation, please call us at ${RESTAURANT_PHONE}.
- We look forward to providing you with an exceptional dining experience!

${RESTAURANT_NAME}
Phone: ${RESTAURANT_PHONE}
Email: ${RESTAURANT_EMAIL}

This is an automated confirmation email.
    `
  }
}

// Restaurant notification email template
const getRestaurantNotificationEmail = (reservation: Reservation) => {
  const date = format(parseISO(reservation.reservation_date), 'EEEE, MMMM do, yyyy')
  const time = format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')
  
  return {
    subject: `New Reservation - ${date} at ${time}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
            .highlight { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ New Reservation Alert</h1>
              <p>${RESTAURANT_NAME}</p>
            </div>
            
            <div class="content">
              <div class="highlight">
                <strong>⏰ ${date} at ${time}</strong>
              </div>
              
              <div class="details">
                <h3>Customer Information</h3>
                <div class="detail-row">
                  <strong>Name:</strong>
                  <span>${reservation.name}</span>
                </div>
                <div class="detail-row">
                  <strong>Email:</strong>
                  <span>${reservation.email}</span>
                </div>
                <div class="detail-row">
                  <strong>Phone:</strong>
                  <span>${reservation.phone || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                  <strong>Party Size:</strong>
                  <span>${reservation.party_size} ${reservation.party_size === 1 ? 'person' : 'people'}</span>
                </div>
                <div class="detail-row">
                  <strong>Confirmation ID:</strong>
                  <span>${reservation.id}</span>
                </div>
                <div class="detail-row">
                  <strong>Booked At:</strong>
                  <span>${format(parseISO(reservation.created_at), 'MMM do, yyyy h:mm a')}</span>
                </div>
                ${reservation.special_requests ? `
                <div class="detail-row">
                  <strong>Special Requests:</strong>
                  <span style="color: #d97706; font-weight: bold;">${reservation.special_requests}</span>
                </div>
                ` : ''}
              </div>
              
              <p><strong>Action Required:</strong> Please prepare for this reservation and ensure table availability.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New Reservation Alert - ${RESTAURANT_NAME}

${date} at ${time}

Customer Information:
- Name: ${reservation.name}
- Email: ${reservation.email}
- Phone: ${reservation.phone || 'Not provided'}
- Party Size: ${reservation.party_size} ${reservation.party_size === 1 ? 'person' : 'people'}
- Confirmation ID: ${reservation.id}
- Booked At: ${format(parseISO(reservation.created_at), 'MMM do, yyyy h:mm a')}
${reservation.special_requests ? `- Special Requests: ${reservation.special_requests}` : ''}

Action Required: Please prepare for this reservation and ensure table availability.
    `
  }
}

// Email service functions
export const emailService = {
  // Send confirmation email to customer
  async sendCustomerConfirmation(reservation: Reservation) {
    try {
      const emailContent = getCustomerConfirmationEmail(reservation)
      
      console.log('Sending customer confirmation to:', reservation.email)
      
      const { data, error } = await resend.emails.send({
        from: `${RESTAURANT_NAME} <onboarding@resend.dev>`,
        reply_to: RESTAURANT_EMAIL,
        to: [reservation.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (error) {
        console.error('Failed to send customer confirmation:', error)
        throw new Error('Failed to send confirmation email')
      }

      console.log('Customer confirmation sent successfully:', data)
      return data
    } catch (error) {
      console.error('Email service error:', error)
      throw error
    }
  },

  // Send notification to restaurant
  async sendRestaurantNotification(reservation: Reservation) {
    try {
      const emailContent = getRestaurantNotificationEmail(reservation)
      
      console.log('Sending restaurant notification to:', RESTAURANT_EMAIL)
      
      const { data, error } = await resend.emails.send({
        from: `Reservation System <onboarding@resend.dev>`,
        reply_to: reservation.email, // Customer can reply directly
        to: [RESTAURANT_EMAIL],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (error) {
        console.error('Failed to send restaurant notification:', error)
        // Don't throw error for restaurant notification failure
        // Customer confirmation is more important
      }

      console.log('Restaurant notification sent successfully:', data)
      return data
    } catch (error) {
      console.error('Restaurant notification error:', error)
      // Don't throw error - this is secondary
    }
  },

  // Send both confirmation and notification emails
  async sendReservationEmails(reservation: Reservation) {
    const results = await Promise.allSettled([
      this.sendCustomerConfirmation(reservation),
      this.sendRestaurantNotification(reservation)
    ])

    // Check if customer confirmation failed (this is critical)
    if (results[0].status === 'rejected') {
      console.error('Customer confirmation failed:', results[0].reason)
      throw new Error('Failed to send customer confirmation email')
    }

    // Log restaurant notification status
    if (results[1].status === 'rejected') {
      console.error('Restaurant notification failed:', results[1].reason)
    }

    return {
      customerConfirmation: results[0].status === 'fulfilled' ? results[0].value : null,
      restaurantNotification: results[1].status === 'fulfilled' ? results[1].value : null,
      errors: results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)
    }
  },

  // Send cancellation email
  async sendCancellationEmail(reservation: Reservation) {
    try {
      const date = format(parseISO(reservation.reservation_date), 'EEEE, MMMM do, yyyy')
      const time = format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')
      
      const { data, error } = await resend.emails.send({
        from: `${RESTAURANT_NAME} <onboarding@resend.dev>`,
        reply_to: RESTAURANT_EMAIL,
        to: [reservation.email],
        subject: `Reservation Cancelled - ${RESTAURANT_NAME}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1>${RESTAURANT_NAME}</h1>
              <p>Reservation Cancelled</p>
            </div>
            <div style="padding: 20px;">
              <p>Dear ${reservation.name},</p>
              <p>This confirms that your reservation has been cancelled:</p>
              <ul>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
                <li><strong>Party Size:</strong> ${reservation.party_size}</li>
                <li><strong>Confirmation #:</strong> ${reservation.id.substring(0, 8).toUpperCase()}</li>
              </ul>
              <p>We hope to serve you another time. To make a new reservation, please visit our website.</p>
              <p>Thank you,<br>${RESTAURANT_NAME}</p>
            </div>
          </div>
        `,
        text: `
Reservation Cancelled - ${RESTAURANT_NAME}

Dear ${reservation.name},

This confirms that your reservation has been cancelled:
- Date: ${date}
- Time: ${time}
- Party Size: ${reservation.party_size}
- Confirmation #: ${reservation.id.substring(0, 8).toUpperCase()}

We hope to serve you another time. To make a new reservation, please visit our website.

Thank you,
${RESTAURANT_NAME}
        `
      })

      if (error) {
        console.error('Failed to send cancellation email:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Cancellation email error:', error)
      throw error
    }
  }
}