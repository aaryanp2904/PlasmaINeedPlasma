import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Plane, QrCode, ExternalLink, Copy, Check, Download, Calendar, MapPin, Clock, Shield, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';

type View = 'home' | 'booking' | 'dashboard';

interface TransactionSuccessProps {
    booking: any;
    onNavigate: (view: View) => void;
    plasmaExplorerBaseUrl?: string;
}

// --- Helper Functions ---

function getAirportCode(str: any) {
    if (!str) return '???';
    const s = String(str);
    const m = s.match(/\(([^)]+)\)/);
    return (m?.[1] ?? s).trim().toUpperCase().substring(0, 3);
}

function getCityName(str: any) {
    if (!str) return 'Unknown City';
    const s = String(str);
    return s.split('(')[0].trim();
}

function formatTime(dt: any) {
    if (!dt) return '--:--';
    const s = String(dt);
    const parsed = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
    if (Number.isNaN(parsed.getTime())) return s;
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dt: any) {
    if (!dt) return 'Dateless';
    const s = String(dt);
    const parsed = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
    if (Number.isNaN(parsed.getTime())) return s;
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeBookingRef() {
    return `SKY${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function safeJsonStringify(obj: any) {
    try {
        return JSON.stringify(obj);
    } catch {
        return String(obj);
    }
}

export function TransactionSuccess({ booking, onNavigate, plasmaExplorerBaseUrl = 'https://testnet.plasmascan.to/tx/' }: TransactionSuccessProps) {
    const [showContent, setShowContent] = useState(false);
    const [planeComplete, setPlaneComplete] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [bookingRef] = useState(() => makeBookingRef());
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        // Start plane animation immediately
        const timer = setTimeout(() => {
            setShowContent(true);
        }, 800);

        const planeTimer = setTimeout(() => {
            setPlaneComplete(true);
        }, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(planeTimer);
        };
    }, []);

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Safe data extraction
    const { addresses, payer, txHash, id, relayId } = booking || {};

    const fromCode = getAirportCode(booking?.origin);
    const fromCity = getCityName(booking?.origin);
    const toCode = getAirportCode(booking?.destination);
    const toCity = getCityName(booking?.destination);

    const transactionData = {
        bookingId: id || bookingRef,
        from: fromCity,
        fromCode: fromCode,
        to: toCity,
        toCode: toCode,
        carrier: booking?.carrierName || booking?.carrier || 'Premier Airlines',
        date: formatDate(booking?.date),
        departure: formatTime(booking?.departure),
        arrival: formatTime(booking?.arrival),
        amount: booking?.price || '0',
        currency: booking?.currency || 'USDC',
        txHash: txHash || '',
        orderId: id || '12',
        relayId: relayId || '17',
        contractAddresses: {
            manager: addresses?.policyManager || '0xDe3...892',
            buyer: payer || '0x71C...9a1',
            payment: addresses?.token || '0x9a8...3b1',
            platform: addresses?.escrow || '0x3f2...c81'
        }
    };

    // Generate QR Payload
    const qrPayload = useMemo(() => {
        const payload = {
            type: 'PLASMA_TRAVEL_TICKET',
            ref: transactionData.bookingId,
            offerId: booking?.id || '0',
            route: `${transactionData.fromCode}-${transactionData.toCode}`,
            pax: booking?.passengers || 1,
            txHash: transactionData.txHash,
        };
        return safeJsonStringify(payload);
    }, [booking, transactionData]);

    // Generate QR Image
    useEffect(() => {
        let cancelled = false;
        async function gen() {
            try {
                const url = await QRCode.toDataURL(qrPayload, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    scale: 8,
                    width: 400,
                    color: { dark: '#1e293b', light: '#ffffff' }
                });
                if (!cancelled) setQrDataUrl(url);
            } catch (err) {
                console.error("QR Generation failed", err);
            }
        }
        gen();
        return () => { cancelled = true; };
    }, [qrPayload]);

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
            {/* Animated Plane - KEPT per user request */}
            <AnimatePresence>
                {!planeComplete && (
                    <motion.div
                        initial={{ x: '-10%', y: '45%' }}
                        animate={{ x: '110%', y: '45%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeInOut' }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center"
                    >
                        <div className="relative">
                            {/* Plane Icon */}
                            <motion.div
                                animate={{
                                    rotate: [0, -5, 0, 5, 0],
                                    y: [0, -10, 0, 10, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                            >
                                <Plane className="w-24 h-24 text-blue-600 drop-shadow-2xl" strokeWidth={1.5} />
                            </motion.div>

                            {/* Contrail effect */}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 1.5 }}
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-1 bg-gradient-to-r from-blue-400/0 via-blue-300/40 to-transparent origin-left"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                <div className="max-w-5xl w-full">
                    {/* Success Header */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.9 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: showContent ? 1 : 0 }}
                            transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-6 shadow-lg shadow-green-500/30"
                        >
                            <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl font-bold text-slate-900 mb-3"
                        >
                            Transaction Successful!
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: showContent ? 1 : 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xl text-slate-600"
                        >
                            Your flight has been booked and payment settled on the Plasma blockchain.
                        </motion.p>
                    </motion.div>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column - Trip Summary & Boarding Pass */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -50 }}
                            transition={{ delay: 0.4 }}
                            className="lg:col-span-2 space-y-6"
                        >
                            {/* Trip Summary Card */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200 shadow-xl">
                                <div className="flex items-center gap-2 mb-6">
                                    <Plane className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-2xl font-semibold text-slate-900">Trip Summary</h2>
                                </div>

                                <div className="space-y-6">
                                    {/* Route */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-500 mb-1">From</p>
                                            <p className="text-2xl font-bold text-slate-900">{transactionData.fromCode}</p>
                                            <p className="text-slate-600">{transactionData.from}</p>
                                        </div>

                                        <div className="flex-shrink-0 px-6">
                                            <div className="relative">
                                                <div className="h-px w-32 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400" />
                                                <motion.div
                                                    animate={{ x: [0, 120, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                    className="absolute -top-2 left-0"
                                                >
                                                    <Plane className="w-5 h-5 text-blue-600" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        <div className="flex-1 text-right">
                                            <p className="text-sm text-slate-500 mb-1">To</p>
                                            <p className="text-2xl font-bold text-slate-900">{transactionData.toCode}</p>
                                            <p className="text-slate-600">{transactionData.to}</p>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Carrier</p>
                                                <p className="font-semibold text-slate-900">{transactionData.carrier}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Date & Time</p>
                                                <p className="font-semibold text-slate-900">{transactionData.date}</p>
                                                <p className="text-sm text-slate-600">{transactionData.departure} - {transactionData.arrival}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <Shield className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Booking ID</p>
                                                <p className="font-semibold text-slate-900">{transactionData.bookingId}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                <ExternalLink className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Payment</p>
                                                <p className="font-semibold text-slate-900">{transactionData.amount} {transactionData.currency}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Boarding Pass */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                                        backgroundSize: '40px 40px'
                                    }} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <p className="text-blue-100 mb-1">Boarding Pass</p>
                                            <h3 className="text-3xl font-bold">{transactionData.bookingId}</h3>
                                        </div>
                                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                            {qrDataUrl ? (
                                                <img src={qrDataUrl} alt="QR" className="w-20 h-20 mix-blend-multiply rounded-lg" />
                                            ) : (
                                                <QrCode className="w-20 h-20 text-slate-900" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-blue-100 text-sm mb-1">Passenger</p>
                                            <p className="font-semibold">You</p>
                                        </div>
                                        <div>
                                            <p className="text-blue-100 text-sm mb-1">Gate</p>
                                            <p className="font-semibold">A12</p>
                                        </div>
                                        <div>
                                            <p className="text-blue-100 text-sm mb-1">Seat</p>
                                            <p className="font-semibold">14C</p>
                                        </div>
                                    </div>

                                    <button className="mt-6 w-full py-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all flex items-center justify-center gap-2 font-medium">
                                        <Download className="w-5 h-5" />
                                        Download Boarding Pass
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Column - Blockchain Receipt */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : 50 }}
                            transition={{ delay: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Blockchain Receipt */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-semibold text-slate-900">Blockchain Receipt</h3>
                                    <a
                                        href={transactionData.txHash ? `${plasmaExplorerBaseUrl}${transactionData.txHash}` : '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        View on Explorer
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                <div className="space-y-4">
                                    {/* Transaction Hash */}
                                    <div>
                                        <label className="text-sm text-slate-500 mb-2 block">Transaction Hash</label>
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 group">
                                            <code className="flex-1 text-sm text-slate-700 truncate font-mono">
                                                {transactionData.txHash || "Pending..."}
                                            </code>
                                            <button
                                                onClick={() => handleCopy(transactionData.txHash, 'tx')}
                                                className="p-1.5 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                                            >
                                                {copiedField === 'tx' ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Order ID */}
                                    <div>
                                        <label className="text-sm text-slate-500 mb-2 block">Order ID</label>
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <code className="text-sm text-slate-700 font-mono">{transactionData.orderId}</code>
                                        </div>
                                    </div>

                                    {/* Relay ID */}
                                    <div>
                                        <label className="text-sm text-slate-500 mb-2 block">Relay ID</label>
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <code className="text-sm text-slate-700 font-mono">{transactionData.relayId}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Addresses */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-xl">
                                <h3 className="text-xl font-semibold text-slate-900 mb-4">Contract Addresses</h3>

                                <div className="space-y-3">
                                    {Object.entries(transactionData.contractAddresses).map(([key, address]) => (
                                        <div key={key}>
                                            <label className="text-xs text-slate-500 mb-1.5 block capitalize">
                                                {key === 'manager' ? 'Manager' :
                                                    key === 'buyer' ? 'Buyer (You)' :
                                                        key === 'payment' ? 'Payment Pool' : 'Platform Treasury'}
                                            </label>
                                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 group">
                                                <code className="flex-1 text-xs text-slate-700 truncate font-mono">
                                                    {address}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(address, key)}
                                                    className="p-1 hover:bg-white rounded transition-colors flex-shrink-0"
                                                >
                                                    {copiedField === key ? (
                                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => onNavigate('booking')}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    Book Another Trip
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => onNavigate('dashboard')}
                                    className="w-full py-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 font-medium hover:bg-white transition-all"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
