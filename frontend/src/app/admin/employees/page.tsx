'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, Trash, PencilSimple, Plus, Pulse, User, MapPin } from '@phosphor-icons/react';
import Modal from '@/components/Modal';

interface Employee {
    id: number;
    user_id: number;
    pickup_address: string | null;
    drop_address: string | null;
    created_at: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        phone?: string | null;
        is_active: boolean;
    };
}

export default function AdminEmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', first_name: '', last_name: '', phone: '',
        pickup_address: '', drop_address: '',
    });

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const data = await api.getEmployees();
            setEmployees(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const resetForm = () => {
        setEditingEmployee(null);
        setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', phone: '', pickup_address: '', drop_address: '' });
    };

    const handleEdit = (emp: Employee) => {
        setEditingEmployee(emp);
        setFormData({
            username: emp.user.username, email: emp.user.email, password: '',
            first_name: emp.user.first_name, last_name: emp.user.last_name,
            phone: emp.user.phone || '', pickup_address: emp.pickup_address || '', drop_address: emp.drop_address || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await api.updateEmployee(editingEmployee.id, {
                    pickup_address: formData.pickup_address || null,
                    drop_address: formData.drop_address || null,
                });
            } else {
                await api.createEmployee(formData);
            }
            setShowModal(false); resetForm(); fetchEmployees();
        } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this employee?')) return;
        try { await api.deleteEmployee(id); setEmployees(employees.filter(e => e.id !== id)); }
        catch { alert('Failed to delete'); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase">Loading Employees...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Users size={28} weight="duotone" className="text-blue-400" />
                        Employee Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage employee pickup/drop locations</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-sm px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase">
                    <Plus size={20} weight="bold" /> Add Employee
                </button>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingEmployee ? 'Edit Employee' : 'Add Employee'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingEmployee && (
                        <>
                            <p className="text-xs text-slate-500 uppercase font-mono">User Account</p>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Username" required className="input-modern" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                <input type="email" placeholder="Email" required className="input-modern" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <input type="text" placeholder="First Name" required className="input-modern" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                <input type="text" placeholder="Last Name" required className="input-modern" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                <input type="password" placeholder="Password" required className="input-modern" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                <input type="tel" placeholder="Phone" className="input-modern" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </>
                    )}
                    <p className="text-xs text-slate-500 uppercase font-mono mt-4">Locations</p>
                    <div className="grid grid-cols-1 gap-4">
                        <input type="text" placeholder="Pickup Address" className="input-modern" value={formData.pickup_address} onChange={e => setFormData({ ...formData, pickup_address: e.target.value })} />
                        <input type="text" placeholder="Drop Address" className="input-modern" value={formData.drop_address} onChange={e => setFormData({ ...formData, drop_address: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-slate-400">Cancel</button>
                        <button type="submit" className="btn-primary">{editingEmployee ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-700/60 text-xs uppercase text-slate-400 font-mono">
                            <th className="p-4">Employee</th>
                            <th className="p-4">Pickup</th>
                            <th className="p-4">Drop</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                        {employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-800/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white"><User size={20} /></div>
                                        <div>
                                            <p className="font-semibold text-slate-200">{emp.user.first_name} {emp.user.last_name}</p>
                                            <p className="text-sm text-slate-500">{emp.user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-slate-400"><MapPin size={14} className="inline mr-1" />{emp.pickup_address || 'Not set'}</td>
                                <td className="p-4 text-sm text-slate-400"><MapPin size={14} className="inline mr-1" />{emp.drop_address || 'Not set'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(emp)} className="p-2 text-slate-400 hover:text-blue-400"><PencilSimple size={18} /></button>
                                    <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {employees.length === 0 && <div className="p-8 text-center text-slate-500">No employees found.</div>}
            </div>
        </div>
    );
}
