import requests

def geocode(location_name):
    """
    Convert a location name to (lat, lon) coordinates using Nominatim API.
    """
    url = f"https://nominatim.openstreetmap.org/search"
    params = {
        'q': location_name,
        'format': 'json',
        'limit': 1
    }
    headers = {
        'User-Agent': 'FuelOptimizationApp/1.0'
    }
    
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    return None

def get_osrm_routes(start_coords, end_coords):
    """
    Fetch routes from OSRM between two (lat, lon) points.
    Returns the raw JSON response containing routes.
    """
    # OSRM expects longitude,latitude
    start_str = f"{start_coords[1]},{start_coords[0]}"
    end_str = f"{end_coords[1]},{end_coords[0]}"
    
    url = f"http://router.project-osrm.org/route/v1/driving/{start_str};{end_str}"
    params = {
        'alternatives': '3',
        'geometries': 'geojson', # Get GeoJSON for easy plotting
        'overview': 'full'
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    return None

def extract_route_points_from_geojson(geojson_coords):
    """
    Extracts route points as list of (lat, lon) tuples from GeoJSON LineString coordinates.
    GeoJSON coordinates are [lon, lat]. We need [lat, lon].
    """
    return [(lat, lon) for lon, lat in geojson_coords]
