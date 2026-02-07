import React from 'react';
import { Plane, Shield, Zap, ArrowRight, TrendingUp, Lock, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ConnectWalletDialog } from './ConnectWalletDialog';

type View = 'home' | 'booking' | 'dashboard';

interface HeroProps {
  onNavigate: (view: View) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            PlasmaTravel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            Dashboard
          </button>
          <ConnectWalletDialog />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-6 pt-20 pb-32 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-blue-100 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-slate-700">Powered by Plasma Network</span>
            </div>

            <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Travel. Pay. Insure.{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Instantly.
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Book flights with instant stablecoin payments on Plasma.
              Add on-chain flight insurance with automatic payouts. No hidden fees, full transparency.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <button
                onClick={() => onNavigate('booking')}
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                Book with Stablecoins
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span>Secure on-chain</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Instant settlement</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Global coverage</span>
              </div>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Main Card */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-600/90 z-10" />
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1762668155432-7994745e815a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhaXJwb3J0JTIwdHJhdmVsJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzA0NzEyOTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Modern travel"
                className="w-full h-[500px] object-cover"
              />
              
              {/* Floating Cards */}
              <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between">
                {/* Transport Card */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl max-w-xs"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Plane className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Flight Booking</p>
                      <p className="font-semibold text-slate-900">NYC → LAX</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">250</span>
                    <span className="text-slate-500">USDC</span>
                  </div>
                </motion.div>

                {/* Insurance Card */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl max-w-xs ml-auto"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Flight Insurance</p>
                      <p className="font-semibold text-slate-900">Auto-Payout Enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-green-500 to-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-green-600">Covered</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Floating Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 flex gap-8"
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">$2.4M+</p>
                <p className="text-sm text-slate-600">Processed</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">12K+</p>
                <p className="text-sm text-slate-600">Bookings</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">98%</p>
                <p className="text-sm text-slate-600">Satisfaction</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Why Choose PlasmaTravel?
          </h2>
          <p className="text-xl text-slate-600">
            The future of travel payments, powered by blockchain
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 hover:border-blue-200 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Instant Settlement</h3>
            <p className="text-slate-600 leading-relaxed">
              Pay with USDC, USDT, or DAI on Plasma. Zero delays, instant confirmation, full transparency.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 hover:border-green-200 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Smart Insurance</h3>
            <p className="text-slate-600 leading-relaxed">
              Add on-chain flight insurance with automatic payouts for delays or cancellations. No paperwork.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Global Access</h3>
            <p className="text-slate-600 leading-relaxed">
              Book transportation worldwide without currency conversion fees or geographic restrictions.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
