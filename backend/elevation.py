import requests

# OpenTopoData API (SRTM 90m resolution)
# Max 100 locations per request.
ELEVATION_API_URL = "https://api.opentopodata.org/v1/srtm90m"

def get_elevations(points):
    """
    Fetch elevations for a list of (lat, lon) points.
    Batches the request if there are more than 100 points.
    Returns a list of elevation values in meters.
    """
    elevations = []
    
    # Process in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        
        # Format: lat1,lon1|lat2,lon2...
        locations = "|".join([f"{lat},{lon}" for lat, lon in batch])
        
        try:
            response = requests.get(ELEVATION_API_URL, params={'locations': locations}, timeout=10)
            if response.status_code == 200:
                data = response.json()
                for result in data.get('results', []):
                    # Handle null elevations (ocean, invalid data)
                    elev = result.get('elevation')
                    elevations.append(elev if elev is not None else 0.0)
            else:
                # Fallback on failure
                elevations.extend([0.0] * len(batch))
        except Exception as e:
            print(f"Elevation API error: {e}")
            elevations.extend([0.0] * len(batch))
            
    return elevations
