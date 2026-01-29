'use client';

import React, { useEffect, useState } from 'react';
import { Gauge, SteeringWheel, Users, Car, Path, Pulse } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    loading?: boolean;
}

function StatCard({ icon: Icon, label, value, color, loading }: StatCardProps) {
    return (
        <div className="card card-hover">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-sm ${color}`}>
                    <Icon size={24} weight="duotone" className="text-white" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">{label}</p>
                    {loading ? (
                        <div className="h-8 w-12 bg-slate-700 animate-pulse rounded-sm" />
                    ) : (
                        <p className="text-2xl font-chivo font-bold">{value}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({ drivers: 0, employees: 0, vehicles: 0, routes: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [drivers, employees, vehicles, routes] = await Promise.all([
                    api.getDrivers(),
                    api.getEmployees(),
                    api.getVehicles(),
                    api.getRoutes(),
                ]);
                setStats({
                    drivers: drivers.length,
                    employees: employees.length,
                    vehicles: vehicles.length,
                    routes: routes.length,
                });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Gauge size={28} weight="duotone" className="text-green-400" />
                    Admin Overview
                </h1>
                <p className="text-slate-500 mt-1">System status and quick actions</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={SteeringWheel} label="Total Drivers" value={stats.drivers} color="bg-green-600" loading={loading} />
                <StatCard icon={Users} label="Total Employees" value={stats.employees} color="bg-blue-600" loading={loading} />
                <StatCard icon={Car} label="Vehicles" value={stats.vehicles} color="bg-purple-600" loading={loading} />
                <StatCard icon={Path} label="Routes" value={stats.routes} color="bg-amber-600" loading={loading} />
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4">
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => router.push('/admin/drivers/')} className="btn-primary text-center">Manage Drivers</button>
                    <button onClick={() => router.push('/admin/employees/')} className="btn-secondary text-center">Manage Employees</button>
                    <button onClick={() => router.push('/admin/vehicles/')} className="btn-secondary text-center">Manage Vehicles</button>
                    <button onClick={() => router.push('/admin/routes/')} className="btn-secondary text-center">Manage Routes</button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-slate-500">
                    <Pulse size={16} className="animate-pulse" />
                    <span className="text-xs font-mono">Loading statistics...</span>
                </div>
            )}
        </div>
    );
}
