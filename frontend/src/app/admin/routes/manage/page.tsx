'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, SteeringWheel, MapPin, Plus, Trash,
    ArrowUp, ArrowDown, MagicWand, Car
} from '@phosphor-icons/react';
import Modal from '@/components/Modal';

interface Employee {
    id: number;
    user: { first_name: string; last_name: string; email: string };
    pickup_address: string | null;
    drop_address: string | null;
}

interface RouteStop {
    id: number;
    employee_id: number;
    sequence_order: number;
}

interface Route {
    id: number;
    name: string;
    driver_id: number | null;
    vehicle_id: number | null;
    route_type: 'PICKUP' | 'DROP';
    is_active: boolean;
    stops: RouteStop[];
}

interface Driver {
    id: number;
    user: { first_name: string; last_name: string };
    assigned_vehicle?: { id: number; car_type: string; vehicle_number: string; capacity: number } | null;
}

function RouteManageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idParam = searchParams.get('id');
    const routeId = idParam ? parseInt(idParam) : null;

    const [route, setRoute] = useState<Route | null>(null);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
    const [stops, setStops] = useState<RouteStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddStopModal, setShowAddStopModal] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

    useEffect(() => {
        if (routeId) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeId]);

    const loadData = useCallback(async () => {
        if (!routeId) return;
        setLoading(true);
        try {
            const [routeData, driversData, employeesData] = await Promise.all([
                api.getRoute(routeId),
                api.getDrivers(),
                api.getEmployees()
            ]);
            setRoute(routeData);
            setStops(routeData.stops.sort((a, b) => a.sequence_order - b.sequence_order));
            setDrivers(driversData);
            setEmployees(employeesData);

            // Filter out employees already in the route
            const existingEmpIds = new Set(routeData.stops.map(s => s.employee_id));
            setAvailableEmployees(employeesData.filter(e => !existingEmpIds.has(e.id)));

        } catch (err) {
            console.error(err);
            alert('Failed to load route data');
        } finally {
            setLoading(false);
        }
    }, [routeId]);

    const handleAssignDriver = async (driverId: number) => {
        if (!routeId) return;
        const selectedDriver = drivers.find(d => d.id === driverId);
        const vehicleId = selectedDriver?.assigned_vehicle?.id || null;

        try {
            await api.updateRoute(routeId, {
                driver_id: driverId,
                vehicle_id: vehicleId
            });
            const updatedRoute = await api.getRoute(routeId);
            setRoute(updatedRoute);
        } catch (err) {
            alert('Failed to assign driver');
        }
    };

    const handleAddStops = async () => {
        if (!routeId) return;
        try {
            let currentMaxSeq = stops.length > 0 ? Math.max(...stops.map(s => s.sequence_order)) : 0;

            for (const empId of selectedEmployees) {
                currentMaxSeq++;
                await api.addRouteStop(routeId, { employee_id: empId, sequence_order: currentMaxSeq });
            }

            setShowAddStopModal(false);
            setSelectedEmployees([]);
            loadData();
        } catch (err) {
            alert('Failed to add stops');
        }
    };

    const handleRemoveStop = async (stopId: number) => {
        if (!routeId) return;
        if (!confirm("Remove this stop?")) return;
        try {
            await api.removeRouteStop(routeId, stopId);
            loadData();
        } catch (err) {
            alert("Failed");
        }
    };

    const moveStop = async (index: number, direction: 'up' | 'down') => {
        if (!routeId) return;
        const newStops = [...stops];
        if (direction === 'up' && index > 0) {
            [newStops[index], newStops[index - 1]] = [newStops[index - 1], newStops[index]];
        } else if (direction === 'down' && index < newStops.length - 1) {
            [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
        } else {
            return;
        }

        newStops.forEach((stop, idx) => stop.sequence_order = idx + 1);
        setStops(newStops);

        try {
            for (const stop of newStops) {
                await api.updateRouteStop(routeId, stop.id, { sequence_order: stop.sequence_order });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to sync order");
            loadData();
        }
    };

    const handleOptimize = async () => {
        if (!routeId) return;
        if (!confirm("Auto-optimize sequence based on location?")) return;
        setLoading(true);
        try {
            const optimizedStops = await api.optimizeRoute(routeId);
            setStops(optimizedStops);
        } catch (err) {
            alert('Optimization failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrip = async () => {
        if (!routeId || !route) return;

        // Resolve vehicle: Use route's vehicle OR find it from the assigned driver
        let effectiveVehicleId = route.vehicle_id;
        if (!effectiveVehicleId && route.driver_id) {
            const drv = drivers.find(d => d.id === route.driver_id);
            if (drv?.assigned_vehicle?.id) {
                effectiveVehicleId = drv.assigned_vehicle.id;
            }
        }

        if (!route.driver_id || !effectiveVehicleId) {
            alert("Cannot create trip: Route must have an assigned Driver and Vehicle.");
            return;
        }
        if (!confirm("Create a scheduled trip for today?")) return;

        try {
            await api.createTrip({
                route_id: routeId,
                driver_id: route.driver_id,
                vehicle_id: effectiveVehicleId,
                status: 'SCHEDULED',
                scheduled_time: new Date().toISOString()
            });
            alert("Trip Created Successfully! Driver can now see it.");
        } catch (err) {
            console.error(err);
            alert("Failed to create trip. Check if one already exists.");
        }
    };



    const toggleStatus = async () => {
        if (!route || !routeId) return;
        try {
            await api.updateRoute(routeId, { is_active: !route.is_active });
            setRoute({ ...route, is_active: !route.is_active });
        } catch (err) { alert('Failed to update status'); }
    };

    if (!routeId) return <div className="p-8 text-center text-red-500">Invalid Route ID</div>;

    if (loading || !route) return (
        <div className="flex justify-center items-center h-64 text-slate-500 font-mono uppercase">Loading Route Details...</div>
    );

    const assignedDriver = drivers.find(d => d.id === route.driver_id);
    const getEmployee = (id: number) => employees.find(e => e.id === id);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {route.name}
                        <span className={`text-xs px-2 py-1 rounded-sm border font-mono ${route.is_active ? 'bg-green-950/50 border-green-800 text-green-400' : 'bg-red-950/50 border-red-800 text-red-400'}`}>
                            {route.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm font-mono uppercase">{route.route_type} Route</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button
                        onClick={handleCreateTrip}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-sm uppercase tracking-wide flex items-center gap-2"
                    >
                        <Car size={18} /> Create Trip
                    </button>
                    <button onClick={toggleStatus} className={`btn-primary ${route.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                        {route.is_active ? 'Deactivate' : 'Activate Route'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Config */}
                <div className="space-y-6">
                    {/* Driver Card */}
                    <div className="card">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <SteeringWheel size={24} className="text-blue-400" />
                            Driver & Vehicle
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase">Assigned Driver</label>
                                <select
                                    className="input-modern w-full"
                                    value={route.driver_id || ''}
                                    onChange={(e) => handleAssignDriver(Number(e.target.value))}
                                >
                                    <option value="">-- No Driver --</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.user.first_name} {d.user.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {assignedDriver && (
                                <div className="bg-slate-900/50 p-4 rounded-sm border border-slate-700/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Car size={20} className="text-purple-400" />
                                        <span className="font-bold text-slate-300">
                                            {assignedDriver.assigned_vehicle?.vehicle_number || 'No Vehicle'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Type: {assignedDriver.assigned_vehicle?.car_type || 'N/A'} |
                                        Capacity: {assignedDriver.assigned_vehicle?.capacity || 'N/A'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="card bg-slate-800/20">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-3">
                                <p className="text-2xl font-bold text-slate-200">{stops.length}</p>
                                <p className="text-xs text-slate-500 uppercase">Stops</p>
                            </div>
                            <div className="p-3">
                                <p className="text-2xl font-bold text-slate-200">
                                    {assignedDriver?.assigned_vehicle ?
                                        Math.max(0, assignedDriver.assigned_vehicle.capacity - stops.length)
                                        : '-'}
                                </p>
                                <p className="text-xs text-slate-500 uppercase">Seats Left</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stops */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <MapPin size={24} className="text-amber-400" />
                            Route Sequence
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOptimize}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-amber-400 transition-colors"
                            >
                                <MagicWand size={16} /> Auto-Optimize
                            </button>
                            <button
                                onClick={() => setShowAddStopModal(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Stop
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {stops.map((stop, index) => {
                            const emp = getEmployee(stop.employee_id);
                            const address = route.route_type === 'PICKUP' ? emp?.pickup_address : emp?.drop_address;

                            return (
                                <div key={stop.id} className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-sm flex items-center gap-4 group hover:border-slate-600 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold font-mono text-slate-400 text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-200">{emp?.user.first_name} {emp?.user.last_name}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <MapPin size={12} weight="fill" />
                                            {address || 'No Address Set'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveStop(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveStop(index, 'down')}
                                            disabled={index === stops.length - 1}
                                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                        <div className="w-px h-4 bg-slate-700 mx-2" />
                                        <button
                                            onClick={() => handleRemoveStop(stop.id)}
                                            className="p-1 hover:bg-red-900/50 text-red-500 rounded"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {stops.length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-sm text-slate-600">
                                No stops added yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Stops Modal */}
            <Modal isOpen={showAddStopModal} onClose={() => setShowAddStopModal(false)} title="Add Employees to Route">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {availableEmployees.length === 0 ? (
                        <p className="text-slate-500">No available employees found.</p>
                    ) : (
                        availableEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center gap-3 p-3 border border-slate-700/50 rounded-sm hover:bg-slate-800/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-900"
                                    checked={selectedEmployees.includes(emp.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                        else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                    }}
                                />
                                <div>
                                    <p className="font-semibold">{emp.user.first_name} {emp.user.last_name}</p>
                                    <p className="text-xs text-slate-500">{emp.user.email}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {route?.route_type === 'PICKUP' ? `Pickup: ${emp.pickup_address || 'N/A'}` : `Drop: ${emp.drop_address || 'N/A'}`}
                                    </p>
                                </div>
                            </label>
                        ))
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                    <button onClick={() => setShowAddStopModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                    <button
                        onClick={handleAddStops}
                        disabled={selectedEmployees.length === 0}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add {selectedEmployees.length} Stops
                    </button>
                </div>
            </Modal>
        </div>
    );
}

export default function RouteManagePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <RouteManageContent />
        </Suspense>
    );
}
