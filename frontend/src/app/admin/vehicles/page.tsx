'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Car, Trash, PencilSimple, Plus, Pulse } from '@phosphor-icons/react';
import Modal from '@/components/Modal';

interface Vehicle {
    id: number;
    vehicle_number: string;
    car_type: 'SEDAN' | 'SUV' | 'VAN' | 'BUS';
    capacity: number;
    assigned_driver_id: number | null;
    is_active: boolean;
}

export default function AdminVehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState<{ vehicle_number: string; car_type: string; capacity: string; assigned_driver_id: number | null }>({
        vehicle_number: '', car_type: 'SEDAN', capacity: '4', assigned_driver_id: null
    });

    const [drivers, setDrivers] = useState<{ id: number; user: { first_name: string; last_name: string; email: string } }[]>([]);

    useEffect(() => {
        fetchVehicles();
        fetchDrivers();
    }, []);

    const fetchVehicles = async () => {
        try { setVehicles(await api.getVehicles()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchDrivers = async () => {
        try { setDrivers(await api.getDrivers()); }
        catch (err) { console.error(err); }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({ vehicle_number: '', car_type: 'SEDAN', capacity: '4', assigned_driver_id: null });
    };

    const handleEdit = (v: Vehicle) => {
        setEditing(v);
        setFormData({
            vehicle_number: v.vehicle_number,
            car_type: v.car_type,
            capacity: String(v.capacity),
            assigned_driver_id: v.assigned_driver_id
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...formData, capacity: parseInt(formData.capacity) };
            if (editing) await api.updateVehicle(editing.id, data);
            else await api.createVehicle(data);
            setShowModal(false); resetForm(); fetchVehicles();
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this vehicle?')) return;
        try { await api.deleteVehicle(id); setVehicles(vehicles.filter(v => v.id !== id)); }
        catch { alert('Failed'); }
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = { SEDAN: 'bg-blue-600', SUV: 'bg-purple-600', VAN: 'bg-amber-600', BUS: 'bg-green-600' };
        return colors[type] || 'bg-slate-600';
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative"><div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" /></div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Vehicles...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Car size={28} weight="duotone" className="text-purple-400" /> Vehicle Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage fleet vehicles</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-sm px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase">
                    <Plus size={20} weight="bold" /> Add Vehicle
                </button>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Vehicle Number (e.g. KA-01-AB-1234)" required className="input-modern w-full" value={formData.vehicle_number} onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })} />
                    <select className="input-modern w-full" value={formData.car_type} onChange={e => setFormData({ ...formData, car_type: e.target.value })}>
                        <option value="SEDAN">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="VAN">Van</option>
                        <option value="BUS">Bus</option>
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Capacity" min="1" max="50" className="input-modern" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} />
                        <select
                            className="input-modern"
                            value={formData.assigned_driver_id || ''}
                            onChange={e => setFormData({ ...formData, assigned_driver_id: e.target.value ? Number(e.target.value) : null })}
                        >
                            <option value="">-- Assign Driver (Optional) --</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.user.first_name} {d.user.last_name} ({d.user.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-slate-400">Cancel</button>
                        <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => (
                    <div key={v.id} className="card card-hover">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-xs px-2 py-1 rounded-sm text-white font-mono ${getTypeColor(v.car_type)}`}>{v.car_type}</span>
                                <h3 className="text-lg font-bold mt-2">{v.vehicle_number}</h3>
                                <p className="text-sm text-slate-500">Capacity: {v.capacity}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Driver: {v.assigned_driver_id ?
                                        drivers.find(d => d.id === v.assigned_driver_id)?.user.first_name || 'Assigned'
                                        : 'Pending'}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(v)} className="p-2 text-slate-400 hover:text-blue-400"><PencilSimple size={18} /></button>
                                <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {vehicles.length === 0 && <div className="text-center text-slate-500 py-8">No vehicles found.</div>}
        </div>
    );
}
