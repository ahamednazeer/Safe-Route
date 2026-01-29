'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Warning, Pulse, CheckCircle, MapPin, Clock } from '@phosphor-icons/react';

interface SOSAlert {
    id: number;
    user_id: number;
    lat: number;
    lng: number;
    status: string;
    triggered_at: string;
}

export default function AdminSOSPage() {
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 5000); // Check every 5s
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAll]);

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await api.getSOSAlerts(!showAll);
            setAlerts(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [showAll]);

    const handleAcknowledge = async (id: number) => {
        try {
            await api.acknowledgeSOSAlert(id);
            fetchAlerts();
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    const handleResolve = async (id: number) => {
        const notes = prompt('Resolution notes (optional):');
        try {
            await api.resolveSOSAlert(id, notes || undefined);
            fetchAlerts();
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    const getStatusStyle = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: 'bg-red-950/50 border-red-800 text-red-400 animate-pulse',
            ACKNOWLEDGED: 'bg-amber-950/50 border-amber-800 text-amber-400',
            RESOLVED: 'bg-green-950/50 border-green-800 text-green-400',
        };
        return styles[status] || 'bg-slate-800 border-slate-700 text-slate-400';
    };

    const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-red-400 animate-pulse" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Alerts...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Warning size={28} weight="duotone" className="text-red-400" /> SOS Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">Emergency alerts · Auto-refreshes every 5s</p>
                </div>
                {activeCount > 0 && (
                    <div className="bg-red-950/50 border border-red-800 rounded-sm px-4 py-2 animate-pulse">
                        <span className="text-red-400 font-bold">{activeCount} ACTIVE ALERT(S)</span>
                    </div>
                )}
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowAll(false)}
                    className={`px-4 py-2 rounded-sm text-sm font-medium ${!showAll ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Active Only
                </button>
                <button
                    onClick={() => setShowAll(true)}
                    className={`px-4 py-2 rounded-sm text-sm font-medium ${showAll ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Show All
                </button>
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="card text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-semibold text-green-400">All Clear</p>
                    <p className="text-sm text-slate-500">No active SOS alerts</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map(alert => (
                        <div key={alert.id} className={`card border-l-4 ${alert.status === 'ACTIVE' ? 'border-l-red-500' : alert.status === 'ACKNOWLEDGED' ? 'border-l-amber-500' : 'border-l-green-500'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Warning size={32} className={alert.status === 'ACTIVE' ? 'text-red-400 animate-pulse' : 'text-slate-500'} />
                                    <div>
                                        <p className="font-bold">SOS Alert #{alert.id}</p>
                                        <p className="text-sm text-slate-400">User ID: {alert.user_id}</p>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(alert.triggered_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded-sm border ${getStatusStyle(alert.status)}`}>
                                        {alert.status}
                                    </span>
                                    {alert.status === 'ACTIVE' && (
                                        <button onClick={() => handleAcknowledge(alert.id)} className="btn-secondary text-xs">
                                            Acknowledge
                                        </button>
                                    )}
                                    {alert.status !== 'RESOLVED' && (
                                        <button onClick={() => handleResolve(alert.id)} className="btn-success text-xs">
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
