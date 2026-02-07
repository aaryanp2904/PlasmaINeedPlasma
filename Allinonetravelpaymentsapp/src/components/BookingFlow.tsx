import React, { useState } from 'react';
import { ArrowLeft, Plane, Calendar, MapPin, Users, Search } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { Checkout } from './Checkout';
import { BookingConfirmation } from './BookingConfirmation';

type View = 'home' | 'booking' | 'dashboard';
type TransportType = 'flight';
type BookingStep = 'search' | 'results' | 'checkout' | 'confirmation';

interface BookingFlowProps {
  onNavigate: (view: View) => void;
  onBookingComplete: (booking: any) => void;
}

interface SearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
  transportType: TransportType;
}

export function BookingFlow({ onNavigate, onBookingComplete }: BookingFlowProps) {
  const [bookingStep, setBookingStep] = useState<BookingStep>('search');
  const [searchParams, setSearchParams] = useState<SearchParams>({
    from: '',
    to: '',
    date: '',
    passengers: 1,
    transportType: 'flight'
  });
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const handleSearch = () => {
    setSearchParams({ ...searchParams, transportType: 'flight' });
    setBookingStep('results');
  };

  const handleSelectBooking = (booking: any) => {
    setSelectedBooking(booking);
    setBookingStep('checkout');
  };

  const handleBackToResults = () => {
    setBookingStep('results');
    setSelectedBooking(null);
  };

  const handleCompleteBooking = (booking: any) => {
    setConfirmedBooking(booking);
    onBookingComplete(booking);
    setBookingStep('confirmation');
  };

  const handleBackToSearch = () => {
    setBookingStep('search');
    setSelectedBooking(null);
    setConfirmedBooking(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('home')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="text-xl font-semibold text-slate-900">Book Your Flight</h1>
          </div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            My Flights
          </button>
        </div>
      </div>

      {bookingStep === 'search' && (
        <div className="max-w-5xl mx-auto px-6 pt-12">
          {/* Transport Type */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 py-4 px-6 rounded-xl font-medium bg-white shadow-lg border-2 border-blue-500 text-blue-600 flex flex-col items-center">
              <Plane className="w-6 h-6 mb-2" />
              Flight
            </div>
          </div>

          {/* Search Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* From */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  From
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchParams.from}
                    onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value })}
                    placeholder="New York (JFK)"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  To
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchParams.to}
                    onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value })}
                    placeholder="Los Angeles (LAX)"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Departure Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Passengers */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={searchParams.passengers}
                    onChange={(e) => setSearchParams({ ...searchParams, passengers: parseInt(e.target.value) })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={!searchParams.from || !searchParams.to || !searchParams.date}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search Flights
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Global Coverage</h3>
              <p className="text-sm text-slate-600">Access to 10,000+ routes worldwide</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Best Prices</h3>
              <p className="text-sm text-slate-600">Compare and save with transparent pricing</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Instant Booking</h3>
              <p className="text-sm text-slate-600">Confirmed in seconds on Plasma</p>
            </div>
          </div>
        </div>
      )}

      {bookingStep === 'results' && (
        <SearchResults
          searchParams={searchParams}
          onSelect={handleSelectBooking}
          onBack={handleBackToSearch}
        />
      )}

      {bookingStep === 'checkout' && selectedBooking && (
        <Checkout
          booking={selectedBooking}
          searchParams={searchParams}
          onBack={handleBackToResults}
          onComplete={handleCompleteBooking}
        />
      )}

      {bookingStep === 'confirmation' && confirmedBooking && (
        <BookingConfirmation
          booking={confirmedBooking}
          onBackToHome={handleBackToSearch}
        />
      )}
    </div>
  );
}
