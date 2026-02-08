import React from 'react';
import { CheckCircle2, Copy, ExternalLink, Shield, ArrowLeft, Plane, FileText } from 'lucide-react';

interface SuccessPageProps {
    booking: any;
    onBackToHome: () => void;
    plasmaExplorerBaseUrl?: string;
}

export function SuccessPage({
    booking,
    onBackToHome,
    plasmaExplorerBaseUrl = 'https://explorer.plasma.xyz/tx/'
}: SuccessPageProps) {
    const { addresses, payer, txHash, id, policyId, insuranceEnabled } = booking;

    const [copied, setCopied] = React.useState<string | null>(null);

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy endpoint', err);
        }
    };

    const explorerUrl = txHash ? `${plasmaExplorerBaseUrl}${txHash}` : '#';

    return (
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
            {/* Success Header */}
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Transaction Successful!</h1>
                <p className="text-lg text-slate-600 max-w-xl mx-auto">
                    Your flight has been booked and payment settled on the Plasma blockchain.
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">

                {/* Left Col: Trip Summary (Visual) */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Plane className="w-4 h-4 text-blue-500" />
                            Trip Summary
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">From</p>
                                <p className="font-bold text-slate-900 text-lg">{booking.origin}</p>
                            </div>
                            <div className="w-px h-4 bg-slate-300 ml-1"></div>
                            <div>
                                <p className="text-sm text-slate-500">To</p>
                                <p className="font-bold text-slate-900 text-lg">{booking.destination}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <p className="text-sm text-slate-500 mb-1">Carrier</p>
                            <p className="font-medium text-slate-900">{booking.carrierName || booking.carrier || 'Airline'}</p>
                        </div>
                    </div>

                    <button
                        onClick={onBackToHome}
                        className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Book Another Trip
                    </button>
                </div>

                {/* Right Col: Transaction & Contract Details */}
                <div className="md:col-span-2 space-y-6">

                    {/* Transaction Receipt Card */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-200 overflow-hidden shadow-sm">
                        <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
                            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Blockchain Receipt
                            </h3>
                            {txHash && (
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-blue-100"
                                >
                                    View on Explorer <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Transaction Hash */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700">Transaction Hash</span>
                                    {copied === 'tx' && <span className="text-xs text-green-600 animate-fade-in">Copied!</span>}
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-blue-300 transition-colors">
                                    <code className="text-sm text-slate-600 font-mono truncate flex-1 leading-none">
                                        {txHash || "Pending..."}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(txHash, 'tx')}
                                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm font-medium text-slate-700 block mb-1">Order ID</span>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-sm text-slate-900">
                                        {id || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-slate-700 block mb-1">Policy ID</span>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-sm text-slate-900 flex items-center gap-2">
                                        {policyId != "0" ? policyId : "None"}
                                        {insuranceEnabled && <Shield className="w-3 h-3 text-green-500" />}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Contract Addresses */}
                    {addresses && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-slate-900 mb-4">Contract Addresses</h3>

                            <div className="space-y-4">
                                {[
                                    { label: 'Merchant', addr: addresses.merchant },
                                    { label: 'Buyer (You)', addr: payer },
                                    { label: 'Payment Token', addr: addresses.token },
                                    { label: 'Escrow Contract', addr: addresses.escrow },
                                ].map((item) => (
                                    <div key={item.label}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</span>
                                            {copied === item.label && <span className="text-xs text-green-600">Copied!</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded w-full border border-slate-100">
                                                {item.addr || "Not Available"}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(item.addr, item.label)}
                                                className="p-1 text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
