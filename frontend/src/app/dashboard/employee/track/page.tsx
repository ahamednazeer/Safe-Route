'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Car, Pulse, NavigationArrow, ShieldCheck } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">Loading Map...</div>
});

// Reusing types/logic or importing if I had a shared file, but for speed defining here
interface TripData {
    id: number;
    status: string;
    driver_id: number;
    vehicle_id: number;
}

interface DriverData {
    id: number;
    user: {
        first_name: string;
        last_name: string;
        phone?: string;
    };
}

interface VehicleData {
    vehicle_number: string;
    car_type: string;
    color?: string;
}

interface DriverLocation {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
}

export default function EmployeeTrackingPage() {
    const router = useRouter();
    const [trip, setTrip] = useState<TripData | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [vehicle, setVehicle] = useState<VehicleData | null>(null);
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
    const [loading, setLoading] = useState(true);

    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [eta, setEta] = useState<number | null>(null);

    // Haversine Distance Calculation (km)
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };



    // Initial Load
    useEffect(() => {
        const init = async () => {
            console.log('[Track] Initializing...');
            try {
                // Get initial user location reliably using native plugin if possible
                const loc = await import('@/lib/nativeLocation').then(m => m.getCurrentPosition());
                if (loc) setMyLocation({ lat: loc.latitude, lng: loc.longitude });

                const activeTrip = await api.getEmployeeActiveTrip().catch((err) => {
                    console.log('[Track] No active trip:', err.message);
                    return null;
                });

                if (activeTrip) {
                    setTrip(activeTrip);
                    console.log('[Track] Active trip found:', activeTrip.id);

                    const [drv, vhc, loc] = await Promise.all([
                        api.getDriver(activeTrip.driver_id).catch(() => null),
                        api.getVehicle(activeTrip.vehicle_id).catch(() => null),
                        api.getDriverLocation(activeTrip.driver_id).catch(() => null)
                    ]);
                    if (drv) setDriver(drv);
                    if (vhc) setVehicle(vhc);
                    if (loc && typeof loc.lat === 'number') {
                        setDriverLocation(loc as DriverLocation);
                    }
                }
            } catch (err: any) {
                console.error('[Track] Init failed:', err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Real-time Polling Logic (Isolated from trip state changes)
    useEffect(() => {
        if (!trip?.id) return;

        let isSubscribed = true;
        console.log('[Track] Starting polling for trip:', trip.id);

        const poll = async () => {
            if (!isSubscribed) return;
            try {
                // 1. Refresh Driver Location
                const loc = await api.getDriverLocation(trip.driver_id).catch(() => null);
                if (loc && typeof loc.lat === 'number' && isSubscribed) {
                    setDriverLocation(loc as DriverLocation);
                }
            } catch (e) {
                console.warn('[Track] Poll failed:', e);
            }
        };

        const intervalId = setInterval(poll, 5000);

        // Refresh User Location Occasionally (30s)
        const userLocId = setInterval(async () => {
            const loc = await import('@/lib/nativeLocation').then(m => m.getCurrentPosition());
            if (loc && isSubscribed) {
                setMyLocation({ lat: loc.latitude, lng: loc.longitude });
            }
        }, 30000);

        return () => {
            isSubscribed = false;
            clearInterval(intervalId);
            clearInterval(userLocId);
            console.log('[Track] Stopping polling');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip?.id]);

    // Recalculate ETA whenever locations change
    useEffect(() => {
        if (driverLocation && myLocation) {
            const dist = getDistance(driverLocation.lat, driverLocation.lng, myLocation.lat, myLocation.lng);

            // SECURITY: If distance is impossible (> 500km), assume user location is default/wrong (e.g. Mountain View simulator)
            if (dist > 500) {
                setEta(null);
                return;
            }

            const estimatedMins = Math.ceil(dist * 2.5); // 2.5 mins per km roughly (24km/h avg)
            setEta(estimatedMins);
        }
    }, [driverLocation, myLocation]);



    const handleCallDriver = () => {
        if (driver?.user.phone) window.location.href = `tel:${driver.user.phone}`;
        else alert('Phone number unavailable');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Tracking...</div>;

    if (!trip) return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
                <Car size={48} className="text-slate-600" weight="duotone" />
            </div>
            <h2 className="text-xl font-bold text-slate-300">No Active Trip</h2>
            <button onClick={() => router.push('/dashboard/employee/')} className="mt-8 btn-primary">Back</button>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 py-4 -mx-4 px-4 border-b border-slate-800">
                <button onClick={() => router.push('/dashboard/employee/')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Pulse size={24} className="text-green-500 animate-pulse" weight="fill" />
                        Live Tracking
                    </h1>
                    <p className="text-xs text-slate-400">Trip #{trip.id} • {trip.status}</p>
                </div>
            </div>

            {/* Map Visualization */}
            <div className="relative h-[50vh] min-h-[400px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl group">
                {driverLocation ? (
                    <LiveMap
                        lat={driverLocation.lat}
                        lng={driverLocation.lng}
                        heading={driverLocation.heading}
                        userLocation={myLocation || undefined}
                        isArrived={eta === 0}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Car size={32} className="text-slate-500" />
                            </div>
                            <p className="text-slate-400 font-mono text-sm">Waiting for GPS...</p>
                        </div>
                    </div>
                )}

                {/* Overlays */}
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />

                {/* Speed Badge */}
                {driverLocation?.speed && (
                    <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Speed</p>
                        <p className="text-lg font-bold font-mono text-white">
                            {Math.round(driverLocation.speed * 3.6)} <span className="text-sm font-normal text-slate-400">km/h</span>
                        </p>
                    </div>
                )}

                {/* Floating Info */}
                <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg text-right shadow-xl z-[1000]">
                    <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">ETA</p>
                    <p className="text-2xl font-bold font-mono text-green-400">
                        {eta !== null ? (eta === 0 ? 'ARRIVED' : `~${eta}`) : '--'}
                        {eta !== null && eta > 0 && <span className="text-sm text-slate-500 ml-1">min</span>}
                    </p>
                    {myLocation && <p className="text-[10px] text-slate-500 mt-1">Based on live distance</p>}
                </div>
            </div>

            {/* Driver & Vehicle Card */}
            <div className="card bg-slate-800/40 backdrop-blur border border-slate-700/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold text-slate-400 uppercase">
                        {driver?.user.first_name[0]}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 uppercase font-bold">Your Driver</p>
                        <h3 className="text-lg font-bold text-white">{driver?.user.first_name} {driver?.user.last_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-green-400" /> Verified</span>
                            <span>•</span>
                            <span>{vehicle?.vehicle_number} ({vehicle?.car_type})</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCallDriver}
                        className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg shadow-green-900/20 active:scale-95 transition-all"
                    >
                        <Phone size={20} weight="fill" />
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => {
                        if (driverLocation) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${driverLocation.lat},${driverLocation.lng}`, '_blank');
                        }
                    }}
                    className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                    <NavigationArrow size={24} className="text-blue-400" />
                    <span className="text-sm font-bold">Open Maps</span>
                </button>
                <button
                    className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                    <ShieldCheck size={24} className="text-am-400 text-slate-400" />
                    <span className="text-sm font-bold text-slate-400">Share Ride</span>
                </button>
            </div>
        </div>
    );
}
