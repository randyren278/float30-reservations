import { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import ReservationForm from '@/components/ReservationForm'

export const metadata: Metadata = {
  title: 'Reservations - Float 30 Restaurant',
  description: 'Make a reservation at Float 30 Restaurant. Book your table online for an exceptional dining experience.',
  keywords: 'restaurant, reservations, dining, Float 30, book table',
  openGraph: {
    title: 'Reservations - Float 30 Restaurant',
    description: 'Make a reservation at Float 30 Restaurant. Book your table online for an exceptional dining experience.',
    type: 'website',
  },
}

export default function ReservationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Float 30 Restaurant</h1>
            <p className="mt-2 text-lg text-gray-600">Online Reservations</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Reservation Form */}
          <div>
            <ReservationForm />
          </div>

          {/* Restaurant Information */}
          <div className="space-y-8">
            {/* About */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About Float 30</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Experience exceptional dining at Float 30 Restaurant, where culinary artistry meets 
                warm hospitality. Our chef-driven menu features fresh, locally-sourced ingredients 
                crafted into memorable dishes that celebrate both tradition and innovation.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Whether you're celebrating a special occasion or enjoying a night out, 
                Float 30 provides an atmosphere that's both elegant and welcoming.
              </p>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact & Hours</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700">Hours</h4>
                  <div className="text-gray-600 text-sm mt-1">
                    <p>Monday - Tuesday: 10:00 AM - 4:00 PM</p>
                    <p>Wednesday - Thursday: 10:00 AM - 8:00 PM</p>
                    <p>Friday - Saturday: 10:00 AM - 9:00 PM</p>
                    <p>Sunday: 10:00 AM - 8:00 PM</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Phone</h4>
                  <a 
                    href="tel:+1-778-300-1378" 
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    (778) 300-1378
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Email</h4>
                  <a 
                    href="mailto:float30reservations@gmail.com" 
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    float30reservations@gmail.com
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Address</h4>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=49.291342,-122.881037"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 text-sm hover:text-blue-600 transition-colors"
                  >
                    Reed Point Way<br />
                    Port Moody, BC V3H 3R5<br />
                    Canada
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Menu</h4>
                  <a 
                    href="https://float30restaurant.com" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    float30restaurant.com
                  </a>
                </div>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reservation Policies</h3>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-700">Arrival Time</h4>
                  <p>Please arrive within 15 minutes of your reservation time. Late arrivals may result in table release.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Cancellations</h4>
                  <p>To modify or cancel your reservation, please call us at least 2 hours in advance.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Large Parties</h4>
                  <p>For parties of 11 or more, please call us directly to ensure we can accommodate your group properly.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Special Requests</h4>
                  <p>We're happy to accommodate dietary restrictions and special occasions. Please include details in your reservation.</p>
                </div>
              </div>
            </div>

            {/* Location Map */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Location</h3>
              
              {/* OpenStreetMap Embed */}
              <div className="bg-gray-200 rounded-lg h-64 overflow-hidden mb-4">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-122.891037%2C49.281342%2C-122.871037%2C49.301342&amp;layer=mapnik&amp;marker=49.291342%2C-122.881037"
                  style={{ border: 0 }}
                  title="Float 30 Restaurant Location"
                ></iframe>
              </div>
              
              {/* Address and Directions */}
              <div className="space-y-3">
                <div className="text-gray-900 font-medium">
                  Reed Point Way<br />
                  Port Moody, BC V3H 3R5<br />
                  Canada
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=49.291342,-122.881037"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Google Maps
                  </a>
                  
                  <a 
                    href="https://www.openstreetmap.org/?mlat=49.291342&mlon=-122.881037#map=16/49.291342/-122.881037&layers=N"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    OpenStreetMap
                  </a>
                  
                  <a 
                    href="https://waze.com/ul?ll=49.291342,-122.881037&navigate=yes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Waze
                  </a>
                </div>
                
                {/* Additional Location Info */}
                <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                  <p><strong>Parking:</strong> Free parking available</p>
                  <p><strong>Transit:</strong> Near Inlet Centre Station (West Coast Express)</p>
                  <p><strong>Landmark:</strong> Located in the Rocky Point area</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Float 30 Restaurant</h3>
            <p className="text-gray-400 text-sm mb-4">
              Exceptional dining experiences in Port Moody, BC
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="tel:+1-778-300-1378" className="text-gray-400 hover:text-white">
                Call Us
              </a>
              <a href="mailto:float30reservations@gmail.com" className="text-gray-400 hover:text-white">
                Email
              </a>
              <a href="https://float30restaurant.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                Main Website
              </a>
              <a href="/admin" className="text-gray-400 hover:text-white">
                Admin Console
              </a>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-gray-500 text-xs">
                © 2025 Float 30 Restaurant. All rights reserved.<br />
                Reed Point Way, Port Moody, BC | (778) 300-1378
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}