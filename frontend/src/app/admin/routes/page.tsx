'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Path, Plus, Trash, PencilSimple, Pulse, MagicWand, Gear } from '@phosphor-icons/react';
import Modal from '@/components/Modal';
import Link from 'next/link';

interface Route {
    id: number;
    name: string;
    driver_id: number | null;
    vehicle_id: number | null;
    route_type: 'PICKUP' | 'DROP';
    is_active: boolean;
    stops: { id: number; employee_id: number; sequence_order: number }[];
}

export default function AdminRoutesPage() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Route | null>(null);
    const [formData, setFormData] = useState({ name: '', route_type: 'PICKUP' });

    useEffect(() => { fetchRoutes(); }, []);

    const fetchRoutes = async () => {
        try { setRoutes(await api.getRoutes()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const resetForm = () => { setEditing(null); setFormData({ name: '', route_type: 'PICKUP' }); };

    const handleEdit = (r: Route) => {
        setEditing(r);
        setFormData({ name: r.name, route_type: r.route_type });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) await api.updateRoute(editing.id, formData);
            else await api.createRoute(formData);
            setShowModal(false); resetForm(); fetchRoutes();
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    const handleOptimize = async (id: number) => {
        if (!confirm('Auto-optimize stop sequence based on distance?')) return;
        try {
            setLoading(true);
            await api.optimizeRoute(id);
            await fetchRoutes();
            setLoading(false);
            alert('Route sequence optimized!');
        }
        catch (err) {
            setLoading(false);
            alert('Optimization Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this route?')) return;
        try { await api.deleteRoute(id); setRoutes(routes.filter(r => r.id !== id)); }
        catch { alert('Failed'); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative"><div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
                <Pulse size={24} className="absolute inset-0 m-auto text-amber-400 animate-pulse" /></div>
            <p className="text-slate-500 font-mono text-xs uppercase">Loading Routes...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Path size={28} weight="duotone" className="text-amber-400" /> Route Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage pickup/drop routes</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-sm px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase">
                    <Plus size={20} weight="bold" /> Add Route
                </button>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Route' : 'Add Route'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Route Name" required className="input-modern w-full" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    <select className="input-modern w-full" value={formData.route_type} onChange={e => setFormData({ ...formData, route_type: e.target.value })}>
                        <option value="PICKUP">Pickup</option>
                        <option value="DROP">Drop</option>
                    </select>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-slate-400">Cancel</button>
                        <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-700/60 text-xs uppercase text-slate-400 font-mono">
                            <th className="p-4">Route</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Stops</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                        {routes.map(r => (
                            <tr key={r.id} className="hover:bg-slate-800/50">
                                <td className="p-4 font-semibold">{r.name}</td>
                                <td className="p-4">
                                    <span className={`text-xs px-2 py-1 rounded-sm font-mono ${r.route_type === 'PICKUP' ? 'bg-green-950/50 text-green-400 border border-green-800' : 'bg-blue-950/50 text-blue-400 border border-blue-800'}`}>
                                        {r.route_type}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400">{r.stops.length} stops</td>
                                <td className="p-4">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${r.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {r.is_active ? 'Active' : 'Inactive'}
                                </td>
                                <td className="p-4 text-right">
                                    <Link href={`/admin/routes/manage?id=${r.id}`} className="p-2 text-slate-400 hover:text-green-400" title="Manage Route">
                                        <Gear size={18} />
                                    </Link>
                                    <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-blue-400"><PencilSimple size={18} /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {routes.length === 0 && <div className="p-8 text-center text-slate-500">No routes found.</div>}
            </div>
        </div>
    );
}
