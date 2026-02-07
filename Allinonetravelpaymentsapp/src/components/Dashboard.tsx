import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plane, QrCode, Shield, ExternalLink, Clock, Download, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

type View = 'home' | 'booking' | 'dashboard';
type DashboardTab = 'upcoming' | 'history' | 'insurance';

interface DashboardProps {
  onNavigate: (view: View) => void;
  bookings: BookingRecord[];
}

type BookingRecord = {
  id: string;
  carrierName?: string;
  carrier?: string;
  origin: string;
  destination: string;
  date: string;
  departure?: string;
  arrival?: string;
  status?: string;
  price: number;
  currency?: string;
  passengers: number;
  insuranceEnabled?: boolean;
  txHash?: string;
};

export function Dashboard({ onNavigate, bookings }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('upcoming');
  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, booking) => sum + (Number.isFinite(booking.price) ? booking.price : 0), 0);
    const totalFlights = bookings.length;
    const insuranceClaims = 0;
    const upcoming = bookings.length;
    const currencies = Array.from(
      new Set(
        bookings.map((booking) => booking.currency ?? 'USDC')
      )
    );
    const currencyLabel = currencies.length === 0 ? '—' : currencies.length === 1 ? currencies[0] : 'Mixed';
    return { totalSpent, totalFlights, insuranceClaims, upcoming, currencyLabel };
  }, [bookings]);

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
            <h1 className="text-xl font-semibold text-slate-900">My Dashboard</h1>
          </div>
          <button 
            onClick={() => onNavigate('booking')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all"
          >
            New Booking
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Spent</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalSpent.toFixed(2)}</p>
            <p className="text-sm text-slate-500 mt-1">{stats.currencyLabel}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Flights</span>
              <Plane className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalFlights}</p>
            <p className="text-sm text-slate-500 mt-1">All time</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Insurance Claims</span>
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.insuranceClaims}</p>
            <p className="text-sm text-slate-500 mt-1">No payouts yet</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Upcoming</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.upcoming}</p>
            <p className="text-sm text-slate-500 mt-1">{stats.upcoming ? 'Confirmed' : 'No bookings yet'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-slate-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'upcoming'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming Flights
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flight History
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'insurance'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flight Insurance
          </button>
        </div>

        {/* Upcoming Trips */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            {bookings.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-slate-600">
                No bookings yet. Book a flight to see it here.
              </div>
            )}

            {bookings.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                        <Plane className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-1">
                          {trip.carrierName ?? trip.carrier ?? 'Airline'}
                        </h3>
                        <p className="text-slate-600">
                          {trip.origin} → {trip.destination}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span>{trip.date}</span>
                          {trip.departure && trip.arrival && (
                            <>
                              <span>•</span>
                              <span>{trip.departure} - {trip.arrival}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      {trip.status ?? 'Confirmed'}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Booking ID</p>
                          <p className="text-lg font-bold text-slate-900">{trip.id}</p>
                        </div>
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-slate-900" />
                        </div>
                      </div>
                      <button className="w-full py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download Ticket
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">Payment Amount</span>
                          <span className="font-semibold text-slate-900">
                            {trip.price.toFixed(2)} {trip.currency ?? 'USDC'}
                          </span>
                        </div>
                        {trip.txHash && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">Tx: {trip.txHash}</span>
                          </div>
                        )}
                      </div>

                      {trip.insuranceEnabled && (
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-slate-900">Flight Insurance Active</span>
                          </div>
                          <p className="text-sm text-slate-600">Auto-payout enabled for delays & cancellations</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Trip History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-slate-600">
              No completed flights yet.
            </div>
          </div>
        )}

        {/* Insurance */}
        {activeTab === 'insurance' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-slate-600">
              No active insurance policies yet.
            </div>

            {/* Insurance Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">How Flight Insurance Works</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Smart contracts automatically monitor flight status via oracles</li>
                    <li>• Payouts are instant when conditions are met (delays, cancellations)</li>
                    <li>• No paperwork or manual claims required</li>
                    <li>• Full transparency - all transactions are on-chain</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
