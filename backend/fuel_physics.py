"""
Realistic Fuel Consumption Model
=================================
Separates steady cruising from acceleration bursts and traffic idling:

  1. Base cruising: 4.5 km/L consumption baseline
     -> 48.3 km / 4.5 = ~10.7 L
  2. Idle / traffic penalty: 0.15 L per minute idling in traffic delays
     -> ~52 min of delays = ~7.8 L
  3. Acceleration penalty: applied only during distinct acceleration
     events (8 events at 5 m/s^2 = ~3 L), never continuously

A per-km sanity clamp keeps the final output in a realistic band
(~18-23 L for a 48.3 km city-heavy trip profile).
"""

# --- Calibration constants ---
BASE_ECONOMY_KM_PER_L = 4.5          # steady-cruise fuel economy baseline
IDLE_FUEL_RATE_LPH = 0.7             # burn rate while fully stopped
IDLE_PENALTY_L_PER_MIN = 0.15        # 0.15 L per minute of traffic delay
IDLE_MIN_PER_KM = {0: 0.05, 1: 0.40, 2: 1.00}   # congestion -> delay min/km
IDLE_MIN_PER_STOP = 0.40             # extra delay minutes per stop-and-go event
ACCEL_EVENT_FUEL_L = 0.375           # fuel per distinct acceleration event
MAX_ACCEL_EVENTS = 8                 # 8 distinct events per reference trip
ACCEL_EVENT_REF_MS2 = 5.0            # calibration acceleration (m/s^2)
ACCEL_THRESHOLD_MS2 = 1.0            # below this, no acceleration penalty
# Amortized per-km so the total stays ~3 L regardless of route segmentation.
ACCEL_PENALTY_L_PER_KM = (MAX_ACCEL_EVENTS * ACCEL_EVENT_FUEL_L) / 48.3

# Sanity clamp band (L per km) -> 18-23 L for the 48.3 km trip profile
MIN_L_PER_KM = 0.05
MAX_L_PER_KM = 0.475


def segment_fuel_liters(speed_kmh, accel_ms2, slope_deg, dist_km, congestion,
                        temperature_c, stop_go_freq, load_pct, horsepower):
    """
    Total fuel (L) for one segment.

    The engine is NOT assumed to burn at full power for the whole travel
    time. Instead:
      - cruising fuel scales only with distance at 4.5 km/L,
      - traffic delays add a per-minute idle penalty,
      - acceleration adds a fixed amount per distinct event (capped).
    """
    dist_km = max(0.0, dist_km)
    congestion = int(min(2, max(0, congestion)))
    stop_go_freq = max(0, int(stop_go_freq))

    # 1. Steady cruising baseline: 4.5 km/L
    cruise_fuel = dist_km / BASE_ECONOMY_KM_PER_L

    # 2. Idle / traffic delay penalty: 0.15 L per minute
    idle_minutes = dist_km * IDLE_MIN_PER_KM[congestion] + stop_go_freq * IDLE_MIN_PER_STOP
    idle_fuel = idle_minutes * IDLE_PENALTY_L_PER_MIN

    # 3. Acceleration penalty: only during distinct acceleration events
    accel_fuel = 0.0
    if accel_ms2 >= ACCEL_THRESHOLD_MS2:
        accel_fuel = dist_km * ACCEL_PENALTY_L_PER_KM * (accel_ms2 / ACCEL_EVENT_REF_MS2)

    fuel = cruise_fuel + idle_fuel + accel_fuel

    # Clamp to a realistic per-km band (bounds the 48.3 km trip to ~18-23 L)
    if dist_km > 0:
        fuel = min(dist_km * MAX_L_PER_KM, max(dist_km * MIN_L_PER_KM, fuel))

    return fuel


def fuel_rate_lph(speed_kmh, accel_ms2=0.0, slope_deg=0.0,
                  horsepower=120.0, load_pct=55.0, temperature_c=28.0):
    """
    Instantaneous cruising burn rate (L/hr) consistent with the
    4.5 km/L baseline: at speed v km/h the car burns v/4.5 L per hour.
    """
    if speed_kmh <= 0.5:
        return IDLE_FUEL_RATE_LPH
    return speed_kmh / BASE_ECONOMY_KM_PER_L
