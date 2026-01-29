'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SteeringWheel, Trash, PencilSimple, Plus, Pulse, User, Shield } from '@phosphor-icons/react';
import Modal from '@/components/Modal';

interface Driver {
    id: number;
    user_id: number;
    license_number: string;
    license_expiry: string;
    emergency_contact: string | null;
    emergency_phone: string | null;
    availability_status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_LEAVE';
    created_at: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        phone?: string | null;
        role: string;
        is_active: boolean;
    };
}

export default function AdminDriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        license_number: '',
        license_expiry: '',
        emergency_contact: '',
        emergency_phone: '',
    });

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const data = await api.getDrivers();
            setDrivers(data);
        } catch (err) {
            setError('Failed to load drivers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingDriver(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            phone: '',
            license_number: '',
            license_expiry: '',
            emergency_contact: '',
            emergency_phone: '',
        });
    };

    const handleEdit = (driver: Driver) => {
        setEditingDriver(driver);
        setFormData({
            username: driver.user.username,
            email: driver.user.email,
            password: '',
            first_name: driver.user.first_name,
            last_name: driver.user.last_name,
            phone: driver.user.phone || '',
            license_number: driver.license_number,
            license_expiry: driver.license_expiry,
            emergency_contact: driver.emergency_contact || '',
            emergency_phone: driver.emergency_phone || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        try {
            await api.deleteDriver(id);
            setDrivers(drivers.filter(d => d.id !== id));
        } catch (err) {
            alert('Failed to delete driver');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await api.updateDriver(editingDriver.id, {
                    license_number: formData.license_number,
                    license_expiry: formData.license_expiry,
                    emergency_contact: formData.emergency_contact || undefined,
                    emergency_phone: formData.emergency_phone || undefined,
                });
                alert('Driver updated successfully');
            } else {
                await api.createDriver({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone || undefined,
                    license_number: formData.license_number,
                    license_expiry: formData.license_expiry,
                    emergency_contact: formData.emergency_contact || undefined,
                    emergency_phone: formData.emergency_phone || undefined,
                });
                alert('Driver created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchDrivers();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save driver';
            alert(message);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'bg-green-950/50 border-green-800 text-green-400';
            case 'ON_TRIP':
                return 'bg-blue-950/50 border-blue-800 text-blue-400';
            case 'OFF_DUTY':
                return 'bg-slate-800/50 border-slate-700 text-slate-400';
            case 'ON_LEAVE':
                return 'bg-amber-950/50 border-amber-800 text-amber-400';
            default:
                return 'bg-slate-800/50 border-slate-700 text-slate-400';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Drivers...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <SteeringWheel size={28} weight="duotone" className="text-green-400" />
                        Driver Management
                    </h1>
                    <p className="text-slate-500 mt-1">Add, edit, and manage system drivers</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-sm px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                >
                    <Plus size={20} weight="bold" /> Add Driver
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingDriver && (
                        <>
                            <p className="text-xs text-slate-500 uppercase font-mono mb-2">User Account</p>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Username"
                                    required
                                    className="input-modern"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    required
                                    className="input-modern"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    required
                                    className="input-modern"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    required
                                    className="input-modern"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    required
                                    className="input-modern"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone (optional)"
                                    className="input-modern"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <p className="text-xs text-slate-500 uppercase font-mono mb-2 mt-6">Driver Details</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">License Number</label>
                            <input
                                type="text"
                                placeholder="License Number"
                                required
                                className="input-modern"
                                value={formData.license_number}
                                onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">License Expiry</label>
                            <input
                                type="date"
                                required
                                className="input-modern"
                                value={formData.license_expiry}
                                onChange={e => setFormData({ ...formData, license_expiry: e.target.value })}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Emergency Contact Name"
                            className="input-modern"
                            value={formData.emergency_contact}
                            onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                        />
                        <input
                            type="tel"
                            placeholder="Emergency Phone"
                            className="input-modern"
                            value={formData.emergency_phone}
                            onChange={e => setFormData({ ...formData, emergency_phone: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingDriver ? 'Update Driver' : 'Create Driver'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Table */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700/60 text-xs uppercase text-slate-400 font-mono">
                                <th className="p-4">Driver</th>
                                <th className="p-4">License</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Emergency</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                            {drivers.map((driver) => (
                                <tr key={driver.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white">
                                                <User size={20} weight="fill" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-200">
                                                    {driver.user.first_name} {driver.user.last_name}
                                                </p>
                                                <p className="text-sm text-slate-500">{driver.user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-mono text-slate-300">{driver.license_number}</p>
                                        <p className="text-xs text-slate-500">
                                            Exp: {new Date(driver.license_expiry).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono border ${getStatusStyle(driver.availability_status)}`}>
                                            <Shield size={12} weight="fill" />
                                            {driver.availability_status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        {driver.emergency_contact || 'Not set'}
                                        {driver.emergency_phone && (
                                            <span className="block text-xs text-slate-600">{driver.emergency_phone}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(driver)}
                                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-sm transition-colors"
                                            >
                                                <PencilSimple size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(driver.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-sm transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {drivers.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-500">
                        No drivers found. Click &quot;Add Driver&quot; to create one.
                    </div>
                )}
            </div>
        </div>
    );
}
