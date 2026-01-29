'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MapPin, Pulse, Truck, Clock } from '@phosphor-icons/react';

interface DriverLocation {
    driver_id: number;
    lat: number;
    lng: number;
    timestamp: string;
}

export default function AdminTrackingPage() {
    const [locations, setLocations] = useState<DriverLocation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchLocations = async () => {
        try {
            const data = await api.getAllDriverLocations();
            setLocations(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Locations...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <MapPin size={28} weight="duotone" className="text-green-400" /> Live Tracking
                </h1>
                <p className="text-slate-500 mt-1">Real-time driver locations · Auto-refreshes every 10s</p>
            </div>

            {/* Map Placeholder */}
            <div className="card h-96 flex items-center justify-center">
                <div className="text-center text-slate-500">
                    <MapPin size={64} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-semibold">Map Integration</p>
                    <p className="text-sm">Connect Leaflet or Google Maps here</p>
                    <p className="text-xs mt-2 font-mono">{locations.length} driver location(s) available</p>
                </div>
            </div>

            {/* Driver Location Table */}
            <div className="card">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Truck size={20} className="text-blue-400" /> Active Drivers
                </h3>
                {locations.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No driver locations recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase text-slate-400 font-mono border-b border-slate-700">
                                    <th className="p-3">Driver ID</th>
                                    <th className="p-3">Latitude</th>
                                    <th className="p-3">Longitude</th>
                                    <th className="p-3">Last Update</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/60">
                                {locations.map((loc) => (
                                    <tr key={loc.driver_id} className="hover:bg-slate-800/50">
                                        <td className="p-3 font-mono">#{loc.driver_id}</td>
                                        <td className="p-3 font-mono text-sm">{loc.lat.toFixed(6)}</td>
                                        <td className="p-3 font-mono text-sm">{loc.lng.toFixed(6)}</td>
                                        <td className="p-3 text-sm text-slate-400 flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(loc.timestamp).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
