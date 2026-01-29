'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, NavigationArrow, Car } from '@phosphor-icons/react';

interface Employee {
    id: number;
    user: { first_name: string; last_name: string };
    pickup_address: string | null;
    drop_address: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    drop_lat: number | null;
    drop_lng: number | null;
}

interface Trip {
    id: number;
    route_id: number;
    status: string;
    route: {
        name: string;
        stops: {
            id: number;
            route_id: number;
            employee_id: number;
            sequence_order: number;
            created_at: string;
            employee: Employee;
        }[];
    };
}

export default function DriverRoutePage() {
    const router = useRouter();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [, setTripDetails] = useState<unknown>(null);

    useEffect(() => {
        loadActiveTrip();
    }, []);

    const loadActiveTrip = async () => {
        setLoading(true);
        try {
            // We need a way to get the *active* trip with route details
            // The existing getMyTrips returns basic info. 
            // We might need a specialized endpoint or fetch trip and then route.
            // Let's try getting active trip ID from list then details.
            const trips = await api.getMyTrips();
            const active = trips.find(t => ['STARTED', 'IN_PROGRESS'].includes(t.status));

            if (active) {
                // Get full trip details and route
                const tripDetails = await api.getTrip(active.id);
                setTripDetails(tripDetails);
                const routeDetails = await api.getRoute(active.route_id);

                // Fetch all employees to map to route stops
                const employees = await api.getEmployees();
                const empMap = new Map(employees.map(e => [e.id, e]));

                // Merge data for display
                const fullTrip: Trip = {
                    ...active,
                    route: {
                        name: routeDetails.name,
                        stops: routeDetails.stops.map(s => ({
                            ...s,
                            employee: empMap.get(s.employee_id)!
                        })).sort((a, b) => a.sequence_order - b.sequence_order)
                    }
                };

                setTrip(fullTrip);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openNavigation = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Route...</div>;

    if (!trip) return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
                <Car size={48} className="text-slate-600" weight="duotone" />
            </div>
            <h2 className="text-xl font-bold text-slate-300">No Active Route</h2>
            <p className="text-slate-500 mt-2">Start a trip from the dashboard to view the route.</p>
            <button onClick={() => router.back()} className="mt-8 btn-primary">
                Back to Dashboard
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 py-4 -mx-4 px-4 border-b border-slate-800">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white leading-tight">{trip.route.name}</h1>
                    <p className="text-xs text-green-400 font-mono uppercase tracking-wider">In Progress</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold font-mono">{trip.route.stops.length}</span>
                    <span className="block text-[10px] text-slate-500 uppercase">Stops</span>
                </div>
            </div>

            <div className="space-y-6">
                {trip.route.stops.map((stop, index) => {
                    const isNext = index === 0; // Logic should check completed stops
                    const address = stop.employee.pickup_address || stop.employee.drop_address; // Simplify for now
                    const lat = stop.employee.pickup_lat || stop.employee.drop_lat;
                    const lng = stop.employee.pickup_lng || stop.employee.drop_lng;

                    return (
                        <div key={stop.id} className={`relative flex gap-4 ${isNext ? 'opacity-100' : 'opacity-60'}`}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 
                                     ${isNext ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                    {index + 1}
                                </div>
                                {index !== trip.route.stops.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-slate-800 my-2" />
                                )}
                            </div>

                            <div className={`flex-1 p-4 rounded-xl border ${isNext ? 'bg-slate-800 border-blue-900/50' : 'bg-slate-900/50 border-slate-800'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className={`font-bold text-lg ${isNext ? 'text-white' : 'text-slate-400'}`}>
                                            {stop.employee.user.first_name} {stop.employee.user.last_name}
                                        </h3>
                                        <p className="text-xs text-slate-500 uppercase">Employee ID: {stop.employee.user.first_name.toUpperCase().slice(0, 3)}-{stop.employee.id}</p>
                                    </div>
                                    {isNext && (
                                        <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-800">
                                            Next Stop
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-start gap-2 mb-4">
                                    <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-300 leading-snug">
                                        {address || 'Location coordinates only'}
                                    </p>
                                </div>

                                {lat && lng && (
                                    <button
                                        onClick={() => openNavigation(lat, lng)}
                                        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-sm transition-all
                                             ${isNext ? 'bg-blue-600 text-white shadow-lg active:scale-[0.98]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <NavigationArrow size={18} weight="fill" />
                                        Navigate
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
