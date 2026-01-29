'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Scroll, ArrowClockwise, Database } from '@phosphor-icons/react';

interface AuditLog {
    id: number;
    action: string;
    details: string;
    created_at: string;
    user_id?: number;
    entity_type?: string;
    entity_id?: number;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getAuditLogs();
            setLogs(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Scroll size={28} weight="duotone" className="text-slate-400" /> System Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1">Traceability of all system events</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors"
                    title="Refresh Logs"
                >
                    <ArrowClockwise size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr>
                                <th className="p-4 text-xs font-mono uppercase text-slate-500">Time</th>
                                <th className="p-4 text-xs font-mono uppercase text-slate-500">Action</th>
                                <th className="p-4 text-xs font-mono uppercase text-slate-500">Entity</th>
                                <th className="p-4 text-xs font-mono uppercase text-slate-500">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors bg-slate-900/20">
                                    <td className="p-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${log.action.includes('SOS') ? 'bg-red-950/50 border-red-800 text-red-400' :
                                            log.action.includes('LOGIN') ? 'bg-blue-950/50 border-blue-800 text-blue-400' :
                                                log.action.includes('TRIP') ? 'bg-green-950/50 border-green-800 text-green-400' :
                                                    'bg-slate-800 border-slate-700 text-slate-400'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-slate-500">
                                        {log.entity_type && (
                                            <>
                                                {log.entity_type} <span className="text-slate-600">#{log.entity_id}</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500">
                                        <Database size={32} className="mx-auto mb-2 opacity-50" />
                                        No audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
