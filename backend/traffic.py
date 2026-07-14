import datetime

def get_traffic_data(base_speed, distance_km):
    """
    Simulates real-time traffic conditions based on the current hour of the day
    and the road's base speed.
    
    Returns:
        tuple: (adjusted_speed, congestion_level, stop_go_frequency)
    """
    now = datetime.datetime.now()
    hour = now.hour
    
    # 1. Determine base congestion level based on time of day (rush hours)
    # Rush hours: 8-10 AM, 5-8 PM
    is_morning_rush = 8 <= hour <= 10
    is_evening_rush = 17 <= hour <= 20
    is_night = hour < 6 or hour > 22
    
    congestion_level = 0 # 0=Low, 1=Moderate, 2=High
    
    if is_morning_rush or is_evening_rush:
        congestion_level = 2
    elif is_night:
        congestion_level = 0
    else:
        # Daytime off-peak
        congestion_level = 1
        
    # Highways (high base speed) are less affected by time-of-day congestion than city roads (low base speed)
    if base_speed > 80:
        congestion_level = max(0, congestion_level - 1)
        
    # 2. Adjust speed based on congestion
    if congestion_level == 2:
        adjusted_speed = base_speed * 0.4  # 60% reduction
    elif congestion_level == 1:
        adjusted_speed = base_speed * 0.75 # 25% reduction
    else:
        adjusted_speed = base_speed        # normal
        
    # Ensure minimum speed
    adjusted_speed = max(10, adjusted_speed)
    
    # 3. Calculate Stop & Go Frequency
    # More congestion = more stops. Longer distance = more chances to stop.
    if congestion_level == 2:
        stops_per_km = 3
    elif congestion_level == 1:
        stops_per_km = 1
    else:
        stops_per_km = 0.2
        
    stop_go_freq = int(stops_per_km * distance_km)
    
    return adjusted_speed, congestion_level, stop_go_freq
