/**
 * API client for Safe Route backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'ADMIN' | 'DRIVER' | 'EMPLOYEE';
    is_active: boolean;
    created_at: string;
}

interface Driver {
    id: number;
    user_id: number;
    license_number: string;
    license_expiry: string;
    emergency_contact: string | null;
    emergency_phone: string | null;
    availability_status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_LEAVE';
    created_at: string;
    user: User;
    assigned_vehicle?: {
        id: number;
        vehicle_number: string;
        car_type: string;
        capacity: number;
    } | null;
}

interface Employee {
    id: number;
    user_id: number;
    pickup_address: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    drop_address: string | null;
    drop_lat: number | null;
    drop_lng: number | null;
    created_at: string;
    user: User;
}

interface Vehicle {
    id: number;
    vehicle_number: string;
    car_type: 'SEDAN' | 'SUV' | 'VAN' | 'BUS';
    capacity: number;
    assigned_driver_id: number | null;
    is_active: boolean;
    created_at: string;
}

interface RouteStop {
    id: number;
    route_id: number;
    employee_id: number;
    sequence_order: number;
    created_at: string;
}

interface Route {
    id: number;
    name: string;
    driver_id: number | null;
    vehicle_id: number | null;
    route_type: 'PICKUP' | 'DROP';
    is_active: boolean;
    created_at: string;
    stops: RouteStop[];
}

interface Trip {
    id: number;
    route_id: number;
    driver_id: number;
    vehicle_id: number;
    status: 'SCHEDULED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduled_time: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    if (response.status === 204) return null as T;
    return response.json();
}

export const api = {
    // Auth
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const response = await request<LoginResponse>('/auth/login', {
            method: 'POST', body: JSON.stringify({ username, password }),
        });
        if (typeof window !== 'undefined') localStorage.setItem('token', response.access_token);
        return response;
    },
    getMe: (): Promise<User> => request('/auth/me'),
    getToken: (): string | null => typeof window === 'undefined' ? null : localStorage.getItem('token'),
    clearToken: (): void => { if (typeof window !== 'undefined') localStorage.removeItem('token'); },

    // Drivers
    getDrivers: (): Promise<Driver[]> => request('/drivers/'),
    getDriver: (id: number): Promise<Driver> => request(`/drivers/${id}`),
    createDriver: (data: Record<string, unknown>): Promise<Driver> => request('/drivers/', { method: 'POST', body: JSON.stringify(data) }),
    updateDriver: (id: number, data: Record<string, unknown>): Promise<Driver> => request(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDriver: (id: number): Promise<void> => request(`/drivers/${id}`, { method: 'DELETE' }),

    // Employees
    getEmployees: (): Promise<Employee[]> => request('/employees/'),
    getEmployeeProfile: (): Promise<Employee> => request('/employees/me'),
    getEmployee: (id: number): Promise<Employee> => request(`/employees/${id}`),
    createEmployee: (data: Record<string, unknown>): Promise<Employee> => request('/employees/', { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id: number, data: Record<string, unknown>): Promise<Employee> => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmployee: (id: number): Promise<void> => request(`/employees/${id}`, { method: 'DELETE' }),

    // Vehicles
    getVehicles: (): Promise<Vehicle[]> => request('/vehicles/'),
    getVehicle: (id: number): Promise<Vehicle> => request(`/vehicles/${id}`),
    createVehicle: (data: Record<string, unknown>): Promise<Vehicle> => request('/vehicles/', { method: 'POST', body: JSON.stringify(data) }),
    updateVehicle: (id: number, data: Record<string, unknown>): Promise<Vehicle> => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteVehicle: (id: number): Promise<void> => request(`/vehicles/${id}`, { method: 'DELETE' }),

    // Routes
    getRoutes: (): Promise<Route[]> => request('/routes/'),
    getRoute: (id: number): Promise<Route> => request(`/routes/${id}`),
    createRoute: (data: Record<string, unknown>): Promise<Route> => request('/routes/', { method: 'POST', body: JSON.stringify(data) }),
    updateRoute: (id: number, data: Record<string, unknown>): Promise<Route> => request(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRoute: (id: number): Promise<void> => request(`/routes/${id}`, { method: 'DELETE' }),
    optimizeRoute: (id: number): Promise<RouteStop[]> => request(`/routes/${id}/optimize`, { method: 'POST' }),
    addRouteStop: (routeId: number, data: { employee_id: number; sequence_order: number }): Promise<RouteStop> =>
        request(`/routes/${routeId}/stops`, { method: 'POST', body: JSON.stringify(data) }),
    updateRouteStop: (routeId: number, stopId: number, data: { sequence_order?: number; employee_id?: number }): Promise<RouteStop> =>
        request(`/routes/${routeId}/stops/${stopId}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeRouteStop: (routeId: number, stopId: number): Promise<void> =>
        request(`/routes/${routeId}/stops/${stopId}`, { method: 'DELETE' }),

    // Trips
    getTrips: (): Promise<Trip[]> => request('/trips/'),
    getMyTrips: (): Promise<Trip[]> => request('/trips/my'),
    getEmployeeActiveTrip: (): Promise<Trip> => request('/trips/employee/active'),
    getTrip: (id: number): Promise<Trip> => request(`/trips/${id}`),
    createTrip: (data: Record<string, unknown>): Promise<Trip> => request('/trips/', { method: 'POST', body: JSON.stringify(data) }),
    updateTripStatus: (id: number, status: string, lat?: number, lng?: number): Promise<Trip> =>
        request(`/trips/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, lat, lng }) }),
    deleteTrip: (id: number): Promise<void> => request(`/trips/${id}`, { method: 'DELETE' }),

    // Location
    updateLocation: (data: { lat: number; lng: number; heading?: number; speed?: number; trip_id?: number }): Promise<unknown> =>
        request('/location/', { method: 'POST', body: JSON.stringify(data) }),
    getDriverLocation: (driverId: number): Promise<{ lat: number; lng: number; timestamp: string }> =>
        request(`/location/driver/${driverId}`),
    getAllDriverLocations: (): Promise<{ driver_id: number; lat: number; lng: number; timestamp: string }[]> =>
        request('/location/all'),

    // SOS
    triggerSOS: (data: { lat: number; lng: number; trip_id?: number; notes?: string }): Promise<unknown> =>
        request('/sos/', { method: 'POST', body: JSON.stringify(data) }),
    getSOSAlerts: (activeOnly: boolean = true): Promise<{ id: number; user_id: number; lat: number; lng: number; status: string; triggered_at: string }[]> =>
        request(`/sos/?active_only=${activeOnly}`),
    acknowledgeSOSAlert: (id: number): Promise<unknown> =>
        request(`/sos/${id}/acknowledge`, { method: 'PATCH' }),
    resolveSOSAlert: (id: number, notes?: string): Promise<unknown> =>
        request(`/sos/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

    // Audit
    getAuditLogs: (): Promise<{ id: number; action: string; details: string; created_at: string }[]> => request('/audit/'),
};
