'use client';

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Reset default icon logic to avoid build issues
type IconPrototype = typeof L.Icon.Default.prototype & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapUpdater({ center, userLocation }: { center: [number, number], userLocation?: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (userLocation) {
            const bounds = L.latLngBounds([center, userLocation]);
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 2 });
        } else {
            map.flyTo(center, map.getZoom(), { duration: 2 });
        }
    }, [center, userLocation, map]);
    return null;
}

export default function LiveMap({ lat, lng, heading, userLocation, isArrived }: {
    lat: number;
    lng: number;
    heading?: number;
    userLocation?: { lat: number; lng: number };
    isArrived?: boolean;
}) {
    // Custom DivIcon for the Car (Driver)
    const carIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
            <div style="transform: rotate(${heading || 0}deg); transition: transform 0.3s ease;" class="relative w-12 h-12 flex items-center justify-center">
                 <div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                 
                 <div class="relative z-10 drop-shadow-2xl">
                    <svg width="50" height="50" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
                        <path d="M150 100 L362 100 L390 400 L122 400 Z" fill="black" opacity="0.3" transform="translate(0, 10)"/>
                        
                        <rect x="110" y="110" width="30" height="60" rx="10" fill="#1e293b"/>
                        <rect x="372" y="110" width="30" height="60" rx="10" fill="#1e293b"/>
                        <rect x="110" y="340" width="30" height="60" rx="10" fill="#1e293b"/>
                        <rect x="372" y="340" width="30" height="60" rx="10" fill="#1e293b"/>

                        <path d="M140 80 C140 40 372 40 372 80 V420 C372 460 140 460 140 420 Z" fill="#2563eb" stroke="white" stroke-width="8"/>
                        
                        <path d="M155 130 H357 L347 190 H165 Z" fill="#1e293b"/>
                        
                        <path d="M160 360 H352 L362 310 H150 Z" fill="#1e293b"/>
                        
                        <rect x="160" y="200" width="192" height="100" fill="#3b82f6" opacity="0.5"/>
                    </svg>
                 </div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
    });

    // Custom DivIcon for User (Me)
    const userIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
            <div class="relative w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg">
                <div class="absolute -inset-2 bg-blue-400/20 rounded-full animate-pulse"></div>
            </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* User Location Marker - Low Z-Index */}
            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={50} />
            )}

            {/* Driver Marker - High Z-Index to show ON TOP of user */}
            <Marker position={[lat, lng]} icon={carIcon} zIndexOffset={1000} />

            <MapUpdater center={[lat, lng]} userLocation={userLocation ? [userLocation.lat, userLocation.lng] : undefined} />
        </MapContainer>
    );
}
