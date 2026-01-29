'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import {
    Truck,
    SignOut,
    Gauge,
    Users,
    SteeringWheel,
    Path,
    Car,
    MapPin,
    Warning,
    Scroll,
} from '@phosphor-icons/react';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface User {
    role: string;
    first_name: string;
    last_name?: string;
    email: string;
}

interface DashboardLayoutProps {
    children: ReactNode;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 64;
const MAX_WIDTH = 320;

const menuItemsByRole: Record<string, MenuItem[]> = {
    ADMIN: [
        { icon: Gauge, label: 'Overview', path: '/admin/' },
        { icon: SteeringWheel, label: 'Drivers', path: '/admin/drivers/' },
        { icon: Users, label: 'Employees', path: '/admin/employees/' },
        { icon: Car, label: 'Vehicles', path: '/admin/vehicles/' },
        { icon: Path, label: 'Routes', path: '/admin/routes/' },
        { icon: MapPin, label: 'Tracking', path: '/admin/tracking/' },
        { icon: Warning, label: 'SOS Alerts', path: '/admin/sos/' },
        { icon: Scroll, label: 'Audit Logs', path: '/admin/audit/' },
    ],
    DRIVER: [
        { icon: Gauge, label: 'Dashboard', path: '/dashboard/driver/' },
        { icon: Path, label: 'My Route', path: '/dashboard/driver/route/' },
    ],
    EMPLOYEE: [
        { icon: Gauge, label: 'Dashboard', path: '/dashboard/employee/' },
        { icon: Path, label: 'Track Vehicle', path: '/dashboard/employee/track/' },
    ],
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Check for mobile viewport and configure Status Bar
    useEffect(() => {
        const checkMobile = async () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Configure Status Bar for native app
            if (mobile) {
                try {
                    const { StatusBar, Style } = await import('@capacitor/status-bar');
                    await StatusBar.setOverlaysWebView({ overlay: true });
                    await StatusBar.setStyle({ style: Style.Dark });
                } catch (e) {
                    console.log('Mobile StatusBar not available (Common in browser)');
                }
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebarWidth');
        const savedHidden = localStorage.getItem('sidebarHidden');
        if (savedWidth) setSidebarWidth(parseInt(savedWidth));
        if (savedHidden === 'true') setIsHidden(true);
    }, []);

    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('sidebarWidth', sidebarWidth.toString());
            localStorage.setItem('sidebarHidden', isHidden.toString());
        }
    }, [sidebarWidth, isHidden, isResizing]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = e.clientX;
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSED_WIDTH, newWidth));
                setSidebarWidth(clampedWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await api.getMe();
                setUser(userData);

                if (pathname.startsWith('/admin') && userData.role !== 'ADMIN') {
                    router.replace('/dashboard/employee/');
                    return;
                }
            } catch {
                router.replace('/');
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [pathname, router]);

    const handleLogout = () => {
        api.clearToken();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center safe-all">
                <div className="text-center space-y-4">
                    <Truck size={48} className="text-green-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">VERIFYING CREDENTIALS...</div>
                </div>
            </div>
        );
    }

    const role = user?.role || 'EMPLOYEE';
    const name = user ? `${user.first_name} ${user.last_name || ''}` : 'User';
    const email = user?.email || 'user@saferoute.com';
    const menuItems = menuItemsByRole[role] || menuItemsByRole.EMPLOYEE;
    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;

    // Mobile bottom nav items (limit to 5 for usability)
    const bottomNavItems = menuItems.slice(0, 4);

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Desktop Sidebar - Hidden on mobile */}
            {!isMobile && (
                <aside
                    ref={sidebarRef}
                    className={`print:hidden bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all safe-top ${isResizing ? 'transition-none' : 'duration-200'
                        } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                    style={{ width: isHidden ? 0 : sidebarWidth }}
                >
                    {/* Header */}
                    <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <Truck size={28} weight="duotone" className="text-green-400 flex-shrink-0" />
                        {showLabels && (
                            <div className="overflow-hidden">
                                <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">Safe Route</h1>
                                <p className="text-xs text-slate-500 font-mono">{role}</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                        <ul className="space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.path;
                                return (
                                    <li key={item.path}>
                                        <button
                                            onClick={() => router.push(item.path)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                                } ${isActive
                                                    ? 'text-green-400 bg-green-950/50 border-l-2 border-green-400'
                                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                                }`}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <Icon size={20} weight="duotone" className="flex-shrink-0" />
                                            {showLabels && <span className="truncate">{item.label}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="p-2 border-t border-slate-800">
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                }`}
                            title={isCollapsed ? 'Sign Out' : undefined}
                        >
                            <SignOut size={20} className="flex-shrink-0" />
                            {showLabels && 'Sign Out'}
                        </button>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-green-500/50 active:bg-green-500 transition-colors z-50"
                        onMouseDown={startResizing}
                        style={{ transform: 'translateX(50%)' }}
                    />
                </aside>
            )}

            {/* Main Content */}
            <main className={`flex-1 overflow-auto relative z-10 ${isMobile ? 'pb-20' : ''}`}>
                {/* Header - Desktop Only */}
                <div className="hidden md:block print:hidden backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40 safe-top safe-x">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <h2 className="font-chivo font-bold text-xl uppercase tracking-wider">Dashboard</h2>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">Welcome back, {name}</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Logged in as</p>
                                <p className="text-sm font-mono text-slate-300">{email}</p>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold text-sm">
                                {name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="px-6 py-4 md:p-6 md:pt-6 pt-16">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            {isMobile && (
                <nav className="bottom-nav print:hidden">
                    <div className="flex items-center justify-center gap-8">
                        {bottomNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => router.push(item.path)}
                                    className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                        {/* Logout in bottom nav */}
                        <button
                            onClick={handleLogout}
                            className="bottom-nav-item text-red-400"
                        >
                            <SignOut size={24} />
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            )}

            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );
}
