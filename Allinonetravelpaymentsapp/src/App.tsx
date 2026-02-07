import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { BookingFlow } from './components/BookingFlow';
import { Dashboard } from './components/Dashboard';

type View = 'home' | 'booking' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [bookings, setBookings] = useState<any[]>([]);

  const handleBookingComplete = (booking: any) => {
    setBookings((prev) => [booking, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {currentView === 'home' && <Hero onNavigate={setCurrentView} />}
      {currentView === 'booking' && (
        <BookingFlow onNavigate={setCurrentView} onBookingComplete={handleBookingComplete} />
      )}
      {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} bookings={bookings} />}
    </div>
  );
}
