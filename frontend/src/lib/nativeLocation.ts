import { Geolocation, Position } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number;
}

export interface LocationError {
    code: string;
    message: string;
}

// Check if running on native platform
export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

// Request location permissions
export const requestLocationPermissions = async (): Promise<boolean> => {
    try {
        if (!isNativePlatform()) {
            // On web, use browser's geolocation API permission
            return true;
        }

        const permissions = await Geolocation.requestPermissions();
        return permissions.location === 'granted' || permissions.coarseLocation === 'granted';
    } catch (error) {
        console.error('Error requesting location permissions:', error);
        return false;
    }
};

// Check current permission status
export const checkLocationPermissions = async (): Promise<boolean> => {
    try {
        if (!isNativePlatform()) {
            return true;
        }

        const permissions = await Geolocation.checkPermissions();
        return permissions.location === 'granted' || permissions.coarseLocation === 'granted';
    } catch (error) {
        console.error('Error checking location permissions:', error);
        return false;
    }
};

// Get current position
export const getCurrentPosition = async (): Promise<LocationData | null> => {
    // Web Fallback (Use native browser API directly for better reliability in dev)
    if (!isNativePlatform() && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve) => {
            const success = (pos: GeolocationPosition) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    speed: pos.coords.speed,
                    heading: pos.coords.heading,
                    timestamp: pos.timestamp
                });
            };

            const error = (err: GeolocationPositionError) => {
                console.warn('High accuracy geolocation failed, trying low accuracy...', err.message);
                // Retry with low accuracy
                navigator.geolocation.getCurrentPosition(
                    success,
                    (finalErr) => {
                        console.error('Web Geolocation Error (Final):', finalErr.message);
                        resolve(null);
                    },
                    { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
                );
            };

            navigator.geolocation.getCurrentPosition(
                success,
                error,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    try {
        const position: Position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp
        };
    } catch (error) {
        console.error('Error getting current position:', error instanceof Error ? error.message : JSON.stringify(error));
        return null;
    }
};

// Watch position with callback
let watchId: string | null = null;

export const startWatchingPosition = async (
    onLocationUpdate: (location: LocationData) => void,
    onError?: (error: LocationError) => void
): Promise<boolean> => {
    try {
        // Stop any existing watch
        await stopWatchingPosition();

        watchId = await Geolocation.watchPosition(
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            },
            (position, err) => {
                if (err) {
                    console.error('Watch position error:', err);
                    onError?.({
                        code: err.code?.toString() || 'UNKNOWN',
                        message: err.message || 'Unknown error'
                    });
                    return;
                }

                if (position) {
                    onLocationUpdate({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        timestamp: position.timestamp
                    });
                }
            }
        );

        return true;
    } catch (error) {
        console.error('Error starting position watch:', error);
        return false;
    }
};

export const stopWatchingPosition = async (): Promise<void> => {
    if (watchId) {
        await Geolocation.clearWatch({ id: watchId });
        watchId = null;
    }
};

// Haptic feedback for important events
export const triggerHapticFeedback = async (style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        const impactStyle = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy
        }[style];

        await Haptics.impact({ style: impactStyle });
    } catch (error) {
        console.error('Error triggering haptic feedback:', error);
    }
};

// SOS haptic pattern - three strong vibrations
export const triggerSOSHaptic = async (): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        for (let i = 0; i < 3; i++) {
            await Haptics.impact({ style: ImpactStyle.Heavy });
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    } catch (error) {
        console.error('Error triggering SOS haptic:', error);
    }
};
