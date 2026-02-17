import numpy as np
from geopy.distance import geodesic


# CONFIG (demo-safe values)

DEFAULT_SPEED = 45          # km/h
DEFAULT_ACCEL = 0.6
DEFAULT_TRAFFIC = 0.4
DEFAULT_TEMP = 28
DEFAULT_LOAD = 300
DEFAULT_POWER = 12


# DISTANCE CALCULATION

def distance_km(p1, p2):
    return geodesic(p1, p2).km


# SIMULATED ELEVATION
# For demo — will be replaced with SRTM later

def simulated_elevation(lat, lon):
    return (lat % 1) * 100   # fake but stable



# SLOPE CALCULATION

def compute_slope(e1, e2, dist_km):

    if dist_km == 0:
        return 0

    dist_m = dist_km * 1000
    return ((e2 - e1) / dist_m) * 100


# SEGMENT FEATURE BUILDER

def segment_features(p1, p2):

    dist = distance_km(p1, p2)

    e1 = simulated_elevation(*p1)
    e2 = simulated_elevation(*p2)

    slope = compute_slope(e1, e2, dist)

    feature = [
        DEFAULT_SPEED,
        DEFAULT_ACCEL,
        slope,
        dist,
        DEFAULT_TRAFFIC,
        DEFAULT_TEMP,
        1,               # stop indicator
        DEFAULT_LOAD,
        DEFAULT_POWER
    ]

    return feature



# FULL ROUTE FEATURE LIST


def extract_route_features(route_points):

    features = []

    for i in range(len(route_points)-1):
        f = segment_features(
            route_points[i],
            route_points[i+1]
        )
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
