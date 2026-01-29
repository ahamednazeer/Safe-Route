'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    requestLocationPermissions,
    startWatchingPosition,
    stopWatchingPosition,
    getCurrentPosition,
    triggerHapticFeedback,
    LocationData
} from '@/lib/nativeLocation';
import { Path, Play, CheckCircle, Pulse, Clock, Car, MapPin, NavigationArrow } from '@phosphor-icons/react';

interface Trip {
    id: number;
    route_id: number;
    status: 'SCHEDULED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduled_time: string | null;
    started_at: string | null;
}

interface UserData {
    first_name: string;
    last_name: string;
}

export default function DriverDashboardPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [trackingActive, setTrackingActive] = useState(false);

    useEffect(() => {
        fetchData();
        initializeLocation();
        return () => { stopWatchingPosition(); };
    }, []);

    const fetchData = async () => {
        try {
            const [tripsData, userData] = await Promise.all([
                api.getMyTrips(),
                api.getMe()
            ]);
            setTrips(tripsData);
            setUser(userData);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const initializeLocation = async () => {
        const hasPermission = await requestLocationPermissions();
        setLocationEnabled(hasPermission);
        if (hasPermission) {
            const position = await getCurrentPosition();
            if (position) setCurrentLocation(position);
        }
    };

    const sendLocationToBackend = useCallback(async (location: LocationData) => {
        try {
            await api.updateLocation({
                lat: location.latitude,
                lng: location.longitude,
                heading: location.heading ?? undefined,
                speed: location.speed ?? undefined
            });
        } catch (err) {
            console.error('Failed to send location:', err);
        }
    }, []);

    const startTracking = useCallback(async () => {
        const success = await startWatchingPosition(
            (location) => {
                setCurrentLocation(location);
                sendLocationToBackend(location);
            },
            (error) => console.error('Location error:', error)
        );
        setTrackingActive(success);
        if (success) triggerHapticFeedback('light');
    }, [sendLocationToBackend]);

    const stopTracking = useCallback(async () => {
        await stopWatchingPosition();
        setTrackingActive(false);
    }, []);

    const handleStatusChange = async (tripId: number, newStatus: string) => {
        try {
            let lat, lng;
            if (newStatus === 'STARTED') {
                // Determine location for geo-fence check
                const pos = currentLocation || await getCurrentPosition();
                if (!pos) throw new Error("GPS Location required to start trip. Please enable GPS.");
                lat = pos.latitude;
                lng = pos.longitude;
            }

            await api.updateTripStatus(tripId, newStatus, lat, lng);
            triggerHapticFeedback('medium');

            if (newStatus === 'STARTED' || newStatus === 'IN_PROGRESS') {
                await startTracking();
            } else if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
                await stopTracking();
            }

            // Refresh trips
            const updatedTrips = await api.getMyTrips();
            setTrips(updatedTrips);
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Dashboard...</p>
        </div>
    );

    const activeTrip = trips.find(t => ['SCHEDULED', 'STARTED', 'IN_PROGRESS'].includes(t.status));
    const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">Welcome back</p>
                    <h1 className="text-2xl md:text-3xl font-chivo font-bold text-white">
                        {user?.first_name}
                    </h1>
                </div>
                {/* Compact Status Indicator & SOS */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            if (!confirm('TRIGGER EMERGENCY SOS?')) return;
                            try {
                                const pos = await getCurrentPosition();
                                if (pos) {
                                    await api.triggerSOS({
                                        lat: pos.latitude,
                                        lng: pos.longitude,
                                        trip_id: activeTrip?.id,
                                        notes: 'Driver Emergency Trigger'
                                    });
                                    alert('SOS SENT!');
                                } else {
                                    alert('GPS required for SOS');
                                }
                            } catch (e) { alert('SOS Failed'); }
                        }}
                        className="bg-red-600 text-white p-2 rounded-full animate-pulse shadow-lg shadow-red-900/50"
                    >
                        <Pulse size={20} weight="fill" />
                    </button>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${trackingActive
                        ? 'bg-green-950/50 border-green-800 text-green-400'
                        : locationEnabled
                            ? 'bg-slate-800 border-slate-700 text-slate-400'
                            : 'bg-red-950/50 border-red-800 text-red-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${trackingActive ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
                        <span className="text-xs font-bold font-mono uppercase overflow-hidden whitespace-nowrap">
                            {trackingActive ? 'Online' : locationEnabled ? 'Ready' : 'GPS Off'}
                        </span>
                    </div>
                </div>
            </div>

            {/* GPS Enable Banner (if disabled) */}
            {!locationEnabled && (
                <button
                    onClick={initializeLocation}
                    className="w-full p-4 bg-red-950/20 border border-red-900/50 rounded-lg flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/30 rounded-full text-red-400">
                            <MapPin size={24} weight="duotone" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-red-400">Enable GPS</p>
                            <p className="text-xs text-red-300/70">Location is required for trips</p>
                        </div>
                    </div>
                    <NavigationArrow size={20} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {/* HERO CARD: Active Trip */}
            {activeTrip ? (
                <div className="relative group overflow-hidden bg-slate-800 border-2 border-green-600/50 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent pointer-events-none" />

                    <div className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500 text-green-950">
                                        {activeTrip.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-mono text-slate-400">#{activeTrip.id}</span>
                                </div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Car size={24} className="text-green-400" weight="duotone" />
                                    Active Trip
                                </h2>
                            </div>
                            {/* Pulse Dot */}
                            <div className="relative w-3 h-3">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </div>
                        </div>

                        {/* Speed/Location Stats */}
                        {trackingActive && currentLocation && (
                            <>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                        <p className="text-[10px] uppercase text-slate-500 font-mono">Speed</p>
                                        <p className="text-2xl font-bold font-mono text-white">
                                            {(currentLocation.speed ? currentLocation.speed * 3.6 : 0).toFixed(0)}
                                            <span className="text-xs text-slate-500 ml-1 font-normal">km/h</span>
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                        <p className="text-[10px] uppercase text-slate-500 font-mono">Heading</p>
                                        <p className="text-xl font-bold font-mono text-white truncate">
                                            {currentLocation.heading ? `${Math.round(currentLocation.heading)}°` : '--'}
                                            <NavigationArrow size={14} className="inline ml-1 text-slate-400" style={{ transform: `rotate(${currentLocation.heading || 0}deg)` }} />
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                        <p className="text-[10px] uppercase text-slate-500 font-mono">Lat</p>
                                        <p className="text-sm font-bold font-mono text-white truncate">
                                            {currentLocation.latitude.toFixed(5)}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                        <p className="text-[10px] uppercase text-slate-500 font-mono">Lng</p>
                                        <p className="text-sm font-bold font-mono text-white truncate">
                                            {currentLocation.longitude.toFixed(5)}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* BIG ACTION BUTTONS */}
                        <div className="grid grid-cols-1 gap-3">
                            {activeTrip.status === 'SCHEDULED' && (
                                <button
                                    onClick={() => handleStatusChange(activeTrip.id, 'STARTED')}
                                    className="h-14 w-full bg-green-600 active:bg-green-700 text-white rounded-lg font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                >
                                    <Play size={24} weight="fill" /> Start Trip
                                </button>
                            )}
                            {activeTrip.status === 'STARTED' && (
                                <button
                                    onClick={() => handleStatusChange(activeTrip.id, 'IN_PROGRESS')}
                                    className="h-14 w-full bg-blue-600 active:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                >
                                    <Path size={24} weight="fill" /> Begin Route
                                </button>
                            )}
                            {activeTrip.status === 'IN_PROGRESS' && (
                                <button
                                    onClick={() => handleStatusChange(activeTrip.id, 'COMPLETED')}
                                    className="h-14 w-full bg-slate-700 active:bg-slate-600 border-2 border-green-500/50 text-green-400 rounded-lg font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                >
                                    <CheckCircle size={24} weight="fill" /> Complete Trip
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* No Active Trip State - Simplified */
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                        <Car size={32} className="text-slate-500" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-300">No Active Trip</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-[200px]">
                        You are currently available. Wait for a schedule or contact admin.
                    </p>
                </div>
            )}

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-md">
                        <CheckCircle size={20} weight="duotone" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-mono">Today</p>
                        <p className="text-lg font-bold text-slate-200">{completedTrips}</p>
                    </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-md">
                        <Clock size={20} weight="duotone" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-mono">Total</p>
                        <p className="text-lg font-bold text-slate-200">{trips.length}</p>
                    </div>
                </div>
            </div>

            {/* History Link / Section */}
            <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 ml-1">Recent Activity</h3>
                <div className="space-y-2">
                    {trips.slice(0, 3).map(trip => (
                        <div key={trip.id} className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${trip.status === 'COMPLETED' ? 'bg-green-500' : 'bg-slate-500'}`} />
                                <span className="text-sm font-mono text-slate-400">#{trip.id}</span>
                            </div>
                            <span className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 bg-slate-800">
                                {trip.status}
                            </span>
                        </div>
                    ))}
                    {trips.length === 0 && (
                        <p className="text-xs text-slate-600 text-center py-2">No history yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}
