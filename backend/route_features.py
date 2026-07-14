import numpy as np
from geopy.distance import geodesic
import elevation
import traffic

# Defaults used only if config doesn't specify
DEFAULT_SPEED = 45          
DEFAULT_ACCEL = 0.6         
DEFAULT_TEMP = 28           
DEFAULT_LOAD = 55           
DEFAULT_POWER = 120         

# DISTANCE CALCULATION
def distance_km(p1, p2):
    return geodesic(p1, p2).km

# SLOPE CALCULATION
def compute_slope(e1, e2, dist_km):
    if dist_km == 0:
        return 0
    dist_m = dist_km * 1000
    return ((e2 - e1) / dist_m) * 100

# SEGMENT FEATURE BUILDER
def segment_features(dist, e1, e2, config):
    slope = compute_slope(e1, e2, dist)
    
    # Get config values or fall back to defaults
    base_speed = config.get('speed_limit', DEFAULT_SPEED)
    accel = config.get('acceleration', DEFAULT_ACCEL)
    temp = config.get('temperature', DEFAULT_TEMP)
    load = config.get('load', DEFAULT_LOAD)
    power = config.get('horsepower', DEFAULT_POWER)
    
    # Get traffic adjusted speed and congestion
    adj_speed, congestion, stop_go = traffic.get_traffic_data(base_speed, dist)

    feature = [
        adj_speed,
        accel,
        slope,
        dist,
        congestion,
        temp,
        stop_go,
        load,
        power
    ]

    return feature

# FULL ROUTE FEATURE LIST
def extract_route_features(route_points, config=None):
    if config is None:
        config = {}
        
    features = []
    
    # 1. Fetch SRTM Elevations for all points in one go (batch)
    elevations = elevation.get_elevations(route_points)
    
    for i in range(len(route_points)-1):
        p1 = route_points[i]
        p2 = route_points[i+1]
        dist = distance_km(p1, p2)
        
        e1 = elevations[i]
        e2 = elevations[i+1]
        
        f = segment_features(dist, e1, e2, config)
        features.append(f)
        
    return features

# DEMO TEST
if __name__ == "__main__":
    route = [
        (22.8426, 88.3586),
        (22.8432, 88.3601),
        (22.8445, 88.3622),
        (22.8451, 88.3650)
    ]
    feats = extract_route_features(route)
    print("Segments:", len(feats))
    print("Feature Vector Example:")
    print(feats[0])
