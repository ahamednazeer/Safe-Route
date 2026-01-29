'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Gauge, Truck, MapPin, Pulse, Phone, Warning, ShieldCheck } from '@phosphor-icons/react';

interface UserData {
    id: number;
    first_name: string;
    last_name: string;
}

interface EmployeeProfile {
    id: number;
    pickup_lat: number | null;
    pickup_lng: number | null;
    drop_lat: number | null;
    drop_lng: number | null;
}

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
    license_number: string;
}

interface VehicleData {
    vehicle_number: string;
    car_type: string;
    color?: string;
}

// Haversine Formula for client-side distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function EmployeeDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
    const [trip, setTrip] = useState<TripData | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [vehicle, setVehicle] = useState<VehicleData | null>(null);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [metrics, setMetrics] = useState<{ dist: string; eta: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(updateRealtimeData, 10000); // Poll for trip/location updates
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate ETA whenever driver location or profile updates
    useEffect(() => {
        if (driverLocation && employeeProfile) {
            // Determine target based on trip type or assume PICKUP for now
            const targetLat = employeeProfile.pickup_lat;
            const targetLng = employeeProfile.pickup_lng;

            if (targetLat && targetLng) {
                const dist = calculateDistance(driverLocation.lat, driverLocation.lng, targetLat, targetLng);
                const speed = 30; // Assume 30km/h avg speed in city
                const time = (dist / speed) * 60; // minutes

                setMetrics({
                    dist: `${dist.toFixed(1)} km`,
                    eta: `${Math.ceil(time)} mins`
                });
            }
        }
    }, [driverLocation, employeeProfile]);

    const updateRealtimeData = useCallback(async () => {
        try {
            const activeTrip = await api.getEmployeeActiveTrip().catch(() => null);

            // Only update trip state if ID changed to avoid unnecessary re-renders
            setTrip(prev => (prev?.id === activeTrip?.id ? prev : activeTrip));

            if (activeTrip) {
                // Only fetch driver/vehicle once
                if (!driver || driver.id !== activeTrip.driver_id) {
                    const [drv, vhc] = await Promise.all([
                        api.getDriver(activeTrip.driver_id).catch(() => null),
                        api.getVehicle(activeTrip.vehicle_id).catch(() => null)
                    ]);
                    if (drv) setDriver(drv);
                    if (vhc) setVehicle(vhc);
                }

                const loc = await api.getDriverLocation(activeTrip.driver_id).catch(() => null);
                if (loc) setDriverLocation(loc);
            } else {
                setDriver(null);
                setVehicle(null);
                setDriverLocation(null);
                setMetrics(null);
            }
        } catch (err) { console.error('Error fetching trip data:', err); }
    }, [driver]);

    const fetchData = useCallback(async () => {
        try {
            const [userData, profileData] = await Promise.all([
                api.getMe(),
                api.getEmployeeProfile().catch(() => null)
            ]);
            setUser(userData);
            if (profileData) setEmployeeProfile(profileData as unknown as EmployeeProfile);

            await updateRealtimeData();
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [updateRealtimeData]);

    const handleSOS = async () => {
        if (!confirm('ARE YOU SURE? This will trigger an emergency alert to the admin and police.')) return;

        try {
            const { getCurrentPosition, triggerSOSHaptic } = await import('@/lib/nativeLocation');
            const pos = await getCurrentPosition();

            if (pos) {
                await api.triggerSOS({
                    lat: pos.latitude,
                    lng: pos.longitude,
                    trip_id: trip?.id,
                    notes: 'Emergency triggered by Employee'
                });
                await triggerSOSHaptic();
                alert('SOS ALERT SENT! Help is on the way.');
            } else {
                alert('GPS required for SOS');
            }
        } catch (err) {
            alert('Failed to send SOS');
            console.error(err);
        }
    };

    const handleCallDriver = () => {
        if (driver?.user.phone) {
            window.location.href = `tel:${driver.user.phone}`;
        } else {
            alert('Driver phone number not available');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Gauge size={28} weight="duotone" className="text-blue-400" /> Employee
                    </h1>
                    <p className="text-slate-500 mt-1">Welcome, {user?.first_name}</p>
                </div>
                <button
                    onClick={handleSOS}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 animate-pulse shadow-lg shadow-red-900/50"
                >
                    <Warning size={20} weight="fill" /> SOS
                </button>
            </div>

            {trip ? (
                <div className="space-y-6">
                    <div className="card border-l-4 border-l-blue-500 bg-slate-900/50">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500 text-blue-950">
                                        {trip.status}
                                    </span>
                                    <span className="text-xs font-mono text-slate-400">Trip #{trip.id}</span>
                                </div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheck size={24} className="text-green-400" weight="duotone" />
                                    Safe Ride Active
                                </h2>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-mono">Driver</p>
                                <p className="font-bold text-lg">{driver?.user.first_name || 'Loading...'}</p>
                                <button
                                    onClick={handleCallDriver}
                                    className="text-xs mt-1 px-3 py-1 bg-green-600 text-white rounded-full flex items-center gap-1 ml-auto hover:bg-green-700"
                                >
                                    <Phone size={12} weight="fill" /> Call
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-mono mb-1">Vehicle</p>
                                <div className="flex items-center gap-2">
                                    <Truck size={20} className="text-slate-300" />
                                    <div>
                                        <p className="font-bold text-white">{vehicle?.vehicle_number}</p>
                                        <p className="text-xs text-slate-400">{vehicle?.car_type}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-mono mb-1">Live Status</p>
                                {driverLocation ? (
                                    <div>
                                        <p className="text-xs font-mono text-green-400 flex items-center gap-1">
                                            <Pulse size={12} weight="fill" className="animate-pulse" /> Tracking Live
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 italic">Waiting for signal...</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => router.push('/dashboard/employee/track/')}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase text-sm text-center shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <MapPin size={18} weight="fill" /> Track Live
                            </button>
                        </div>
                    </div>

                    <div className="card h-64 bg-slate-900 border-slate-800 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                        <div className="text-center z-10 w-full px-4">
                            {driverLocation && metrics ? (
                                <>
                                    <MapPin size={48} weight="fill" className="text-blue-500 mx-auto mb-2 animate-bounce" />
                                    <p className="font-mono text-lg text-white">Driver Nearby</p>
                                    <p className="text-sm text-slate-400">
                                        Dist: <span className="text-white font-bold">{metrics.dist}</span> • ETA: <span className="text-white font-bold">{metrics.eta}</span>
                                    </p>
                                    <p className="text-xs text-slate-600 mt-4">(Distance calculated using live GPS)</p>
                                </>
                            ) : (
                                <p className="text-slate-500">Waiting for driver location update...</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card py-12 text-center">
                    <div className="bg-slate-800 p-4 rounded-full inline-block mb-4">
                        <Truck size={32} className="text-slate-500" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-300">No Active Trip</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                        You don&apos;t have any scheduled trips right now. Please check back later or contact admin.
                    </p>
                    <button className="mt-6 text-sm text-blue-400 hover:text-blue-300 underline">
                        View Past Trips
                    </button>
                </div>
            )}
        </div>
    );
}
