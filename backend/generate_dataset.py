"""
eVED-Inspired Fuel Consumption Dataset Generator
=================================================
Generates a physics-based synthetic dataset modelled after the Extended Vehicle 
Energy Dataset (eVED). Uses real fuel consumption physics to create consistent, 
learnable relationships between driving features and fuel rate.

Physics model:
  FuelRate ∝ (base_consumption) 
           + (speed_factor)        — aerodynamic drag grows with v²
           + (acceleration_factor) — positive accel = more throttle
           + (slope_factor)        — uphill adds load, downhill saves
           + (congestion_factor)   — stop-and-go wastes fuel
           + (temperature_factor)  — extreme temps = AC/heating load
           + (engine_load_factor)  — direct proportionality
           + (vehicle_power_factor)— bigger engine = more consumption
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)

# ─────────────────────── CONFIG ───────────────────────
N_SAMPLES = 5000

# Indian cities with typical temperature ranges
CITIES = {
    "Mumbai":    (25, 38),
    "Delhi":     (18, 45),
    "Bangalore": (20, 34),
    "Kolkata":   (22, 40),
    "Chennai":   (24, 42),
    "Hyderabad": (22, 40),
    "Pune":      (18, 36),
    "Jaipur":    (15, 45),
    "Lucknow":   (15, 44),
    "Ahmedabad": (20, 44),
}

# Vehicle classes: (horsepower_range, fuel_efficiency_base)
VEHICLE_CLASSES = {
    "Hatchback":  ((70, 100),  0.85),   # smaller engine, efficient
    "Sedan":      ((100, 150), 1.00),   # mid-range
    "SUV":        ((140, 200), 1.20),   # bigger, heavier
    "MUV":        ((90, 140),  1.10),   # multi-utility
}

ROAD_TYPES = {
    0: "Highway",     # 0 = Highway (higher speed, less stops)
    1: "Urban",       # 1 = Urban (moderate)
    2: "Residential", # 2 = Residential (slow, many stops)
}

FUEL_TYPES = ["Petrol", "Diesel", "CNG"]
WEATHER_CONDITIONS = [0, 1, 2]  # 0=Clear, 1=Rain, 2=Fog

# ─────────────────────── GENERATION ───────────────────────

def generate_dataset(n=N_SAMPLES):
    """Generate a physics-based fuel consumption dataset."""
    
    data = []
    
    for _ in range(n):
        # ── Vehicle Selection ──
        vclass = np.random.choice(list(VEHICLE_CLASSES.keys()))
        hp_range, efficiency_base = VEHICLE_CLASSES[vclass]
        horsepower = np.random.uniform(*hp_range)
        
        fuel_type = np.random.choice(FUEL_TYPES, p=[0.50, 0.35, 0.15])
        
        # Fuel type efficiency modifier
        fuel_modifier = {"Petrol": 1.0, "Diesel": 0.85, "CNG": 0.92}[fuel_type]
        
        # ── Location & Environment ──
        city = np.random.choice(list(CITIES.keys()))
        temp_range = CITIES[city]
        temperature = np.random.uniform(*temp_range)
        
        weather = np.random.choice(WEATHER_CONDITIONS, p=[0.60, 0.25, 0.15])
        
        # ── Road Conditions ──
        road_type = np.random.choice([0, 1, 2], p=[0.25, 0.50, 0.25])
        
        # Speed depends on road type
        if road_type == 0:    # Highway
            speed = np.random.uniform(60, 120)
            traffic_signals = np.random.randint(0, 5)
            stop_go_freq = np.random.randint(0, 10)
            congestion = np.random.choice([0, 1, 2], p=[0.60, 0.30, 0.10])
        elif road_type == 1:  # Urban
            speed = np.random.uniform(20, 60)
            traffic_signals = np.random.randint(5, 30)
            stop_go_freq = np.random.randint(10, 40)
            congestion = np.random.choice([0, 1, 2], p=[0.20, 0.45, 0.35])
        else:                 # Residential
            speed = np.random.uniform(10, 35)
            traffic_signals = np.random.randint(2, 15)
            stop_go_freq = np.random.randint(5, 25)
            congestion = np.random.choice([0, 1, 2], p=[0.50, 0.35, 0.15])
        
        # ── Driving Behaviour ──
        acceleration = np.random.uniform(0.1, 2.5)
        brake = np.random.choice([0, 1], p=[0.65, 0.35])
        
        # Engine parameters (correlate with speed and acceleration)
        engine_load = 40 + (speed / 120) * 25 + acceleration * 5 + np.random.normal(0, 3)
        engine_load = np.clip(engine_load, 30, 95)
        
        rpm = 800 + (speed / 120) * 2500 + acceleration * 300 + np.random.normal(0, 150)
        rpm = np.clip(rpm, 700, 5000)
        
        throttle = 10 + (acceleration / 2.5) * 50 + (speed / 120) * 20 + np.random.normal(0, 5)
        throttle = np.clip(throttle, 5, 95)
        
        # ── Terrain ──
        slope = np.random.normal(0, 3)  # degrees, most roads are flat-ish
        slope = np.clip(slope, -10, 10)
        
        distance = np.random.uniform(0.1, 5.0)  # km per segment
        
        elevation = np.random.uniform(0, 800)  # metres above sea level
        
        # ──────────────────────────────────────────────────
        # PHYSICS-BASED FUEL RATE CALCULATION (L/hr)
        # ──────────────────────────────────────────────────
        
        # Base consumption (idle ~ 0.8 L/hr)
        base = 0.8
        
        # Speed effect: aerodynamic drag ∝ v² but fuel economy peaks ~50-60 km/h
        # Below optimal: engine works hard at low gear
        # Above optimal: drag dominates
        optimal_speed = 55
        speed_factor = 0.015 * ((speed - optimal_speed) ** 2) / 100
        
        # Acceleration effect: positive accel needs more fuel
        accel_factor = 0.8 * max(0, acceleration)
        
        # Slope effect: uphill +, downhill -
        slope_factor = 0.25 * slope
        
        # Congestion effect: stop-and-go wastes fuel
        congestion_factor = congestion * 0.4 + (stop_go_freq / 50) * 0.6
        
        # Temperature effect: extreme heat/cold = AC/heating
        temp_optimal = 25
        temp_factor = 0.02 * abs(temperature - temp_optimal)
        
        # Engine load effect
        load_factor = (engine_load - 50) * 0.03
        
        # Vehicle size/power effect
        power_factor = (horsepower - 100) * 0.005 * efficiency_base
        
        # Weather effect
        weather_factor = weather * 0.15  # rain/fog = slightly more fuel
        
        # Braking effect (if braking, engine is under different load)
        brake_factor = -0.2 if brake else 0
        
        # Combine all factors
        fuel_rate = (
            base 
            + speed_factor 
            + accel_factor 
            + slope_factor 
            + congestion_factor 
            + temp_factor 
            + load_factor 
            + power_factor 
            + weather_factor
            + brake_factor
        ) * fuel_modifier
        
        # Add small realistic noise (sensor measurement error)
        noise = np.random.normal(0, 0.12)
        fuel_rate = fuel_rate + noise
        
        # Ensure positive fuel rate
        fuel_rate = max(0.3, fuel_rate)
        
        # Round to 2 decimal places
        fuel_rate = round(fuel_rate, 2)
        
        data.append({
            "Speed_kmh": round(speed, 2),
            "Acceleration_ms2": round(acceleration, 2),
            "EngineLoad_pct": round(engine_load, 1),
            "RPM": int(rpm),
            "Throttle_pct": round(throttle, 1),
            "Congestion": congestion,
            "TrafficSignals": traffic_signals,
            "StopGoFrequency": stop_go_freq,
            "Temperature_C": round(temperature, 1),
            "Slope_deg": round(slope, 2),
            "Distance_km": round(distance, 2),
            "Elevation_m": round(elevation, 1),
            "Brake": brake,
            "RoadType": road_type,
            "Weather": weather,
            "Horsepower": int(horsepower),
            "VehicleClass": vclass,
            "FuelType": fuel_type,
            "City": city,
            "FuelRate_Lph": fuel_rate,
        })
    
    df = pd.DataFrame(data)
    return df


# ─────────────────────── MAIN ───────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  eVED-Inspired Dataset Generator")
    print("=" * 60)
    
    df = generate_dataset(N_SAMPLES)
    
    # Save dataset
    output_path = os.path.join(os.path.dirname(__file__), "eved_fuel_dataset.csv")
    df.to_csv(output_path, index=False)
    
    print(f"\n[OK] Dataset generated: {len(df)} samples")
    print(f"[OK] Saved to: {output_path}")
    print(f"\nColumns ({len(df.columns)}):")
    for col in df.columns:
        print(f"  - {col}: {df[col].dtype} | range [{df[col].min()} - {df[col].max()}]")
    
    print(f"\nFuelRate_Lph statistics:")
    print(df["FuelRate_Lph"].describe().to_string())
    print("\n" + "=" * 60)
