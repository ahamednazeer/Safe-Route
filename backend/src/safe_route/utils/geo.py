"""Location utilities for distance and ETA calculations."""

import math
from typing import List, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in kilometers.
    """
    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lon2, lat1, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles.
    return c * r

def calculate_eta_minutes(distance_km: float, speed_kmh: float = 30.0) -> int:
    """Calculate ETA in minutes based on distance and average speed."""
    if speed_kmh <= 0: return 0
    hours = distance_km / speed_kmh
    return int(hours * 60)

def optimize_route_sequence(start_location: Tuple[float, float], stops: List[dict]) -> List[dict]:
    """
    Re-order stops using Nearest Neighbor algorithm.
    Stops must have 'lat' and 'lng' keys.
    """
    if not stops:
        return []
        
    optimized = []
    current_pos = start_location
    pool = stops.copy()
    
    while pool:
        # Find nearest stop to current position
        nearest = min(pool, key=lambda s: haversine_distance(current_pos[0], current_pos[1], s['lat'], s['lng']))
        optimized.append(nearest)
        current_pos = (nearest['lat'], nearest['lng'])
        pool.remove(nearest)
    
    # Update sequence order
    for idx, stop in enumerate(optimized):
        stop['sequence_order'] = idx + 1
        
    return optimized
