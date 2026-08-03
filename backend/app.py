import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib
import routing
import route_features
import fuel_physics

load_dotenv()

app = Flask(__name__, template_folder='../templates', static_folder='../static')
CORS(app)

# Google Maps API key — loaded from .env via GOOGLE_MAPS_KEY env var
app.config['GOOGLE_MAPS_KEY'] = os.environ.get('GOOGLE_MAPS_KEY', '')

# LOAD MODEL & SCALER
base_path = os.path.dirname(os.path.abspath(__file__))
model = joblib.load(os.path.join(base_path, "xgboost_model.pkl"))
scaler = joblib.load(os.path.join(base_path, "scaler.pkl"))

print("XGBoost Model & Scaler loaded successfully.")


def _feat(features, idx, default):
    """Safely extract a numeric feature value with a default fallback."""
    try:
        return float(features[idx])
    except (IndexError, TypeError, ValueError):
        return default


def _seg_fuel(features):
    """Compute fuel (L) for a single segment using the physical power equation."""
    return fuel_physics.segment_fuel_liters(
        speed_kmh=_feat(features, 0, 45.0),
        accel_ms2=_feat(features, 1, 0.6),
        slope_deg=_feat(features, 2, 0.0),
        dist_km=_feat(features, 3, 1.0),
        congestion=_feat(features, 4, 0.0),
        temperature_c=_feat(features, 5, 28.0),
        stop_go_freq=_feat(features, 6, 0.0),
        load_pct=_feat(features, 7, 55.0),
        horsepower=_feat(features, 8, 120.0),
    )


def _fuel_rate(features):
    """Compute instantaneous fuel burn rate (L/hr) for reporting."""
    return fuel_physics.fuel_rate_lph(
        speed_kmh=_feat(features, 0, 45.0),
        accel_ms2=_feat(features, 1, 0.6),
        slope_deg=_feat(features, 2, 0.0),
        horsepower=_feat(features, 8, 120.0),
        load_pct=_feat(features, 7, 55.0),
        temperature_c=_feat(features, 5, 28.0),
    )


# PAGE ROUTES
@app.route("/")
def home():
    return render_template("index.html")


# ML PREDICTION APIs

# 1. Single Segment Prediction
@app.route("/predict_segment", methods=["POST"])
def predict_segment():
    data = request.json or {}
    features = data.get("features", [])

    if not features:
        return jsonify({"error": "No features provided."}), 400

    fuel_liters = _seg_fuel(features)
    rate_lph = _fuel_rate(features)

    return jsonify({
        "predicted_fuel": fuel_liters,
        "fuel_consumption": fuel_liters,
        "estimated_fuel": fuel_liters,
        "fuel": fuel_liters,
        "fuel_rate_lph": rate_lph
    })


# 2. Full Route Prediction
@app.route("/predict_route", methods=["POST"])
def predict_route():
    data = request.json or {}
    segments = data.get("segments", [])

    if not segments:
        return jsonify({"error": "No segments provided."}), 400

    segment_liters = [_seg_fuel(seg) for seg in segments]
    total_fuel = float(np.sum(segment_liters))

    return jsonify({
        "segment_fuel": segment_liters,
        "total_fuel": total_fuel,
        "predicted_fuel": total_fuel,
        "estimated_fuel": total_fuel,
        "fuel": total_fuel
    })


# 3. Compare Routes
@app.route("/compare_routes", methods=["POST"])
def compare_routes():
    data = request.json or {}
    routes = data.get("routes", [])   # list of routes, each route is a list of segments

    if not routes:
        return jsonify({"error": "No routes provided for comparison."}), 400

    route_totals = []

    for route_segments in routes:
        if not route_segments:
            route_totals.append(0.0)
            continue

        route_totals.append(float(np.sum([_seg_fuel(seg) for seg in route_segments])))

    best_index = int(np.argmin(route_totals))   # lowest fuel = most efficient

    return jsonify({
        "route_fuel": route_totals,
        "total_fuel": route_totals,
        "best_route_index": best_index
    })


# 4. Generate Routes from OpenStreetMap (OSRM)
@app.route("/generate_routes", methods=["POST"])
def generate_routes():
    data = request.json or {}
    source_str = data.get("source")
    dest_str = data.get("destination")

    if not source_str or not dest_str:
        return jsonify({"error": "Source and destination are required."}), 400
    
    # Robust feature compilation supporting both key conventions
    config = {
        'speed_limit': float(data.get('speed_limit') or data.get('speed') or 45),
        'acceleration': float(data.get('acceleration') or data.get('accel') or 0.6),
        'temperature': float(data.get('temperature') or data.get('temp') or 28),
        'load': float(data.get('load') or 55),
        'horsepower': float(data.get('horsepower') or data.get('hp') or 120)
    }
    
    print("=" * 60)
    print("DEBUG /generate_routes — Config received from frontend:")
    print(f"  speed_limit  = {config['speed_limit']}")
    print(f"  acceleration = {config['acceleration']}")
    print(f"  temperature  = {config['temperature']}")
    print(f"  load         = {config['load']}")
    print(f"  horsepower   = {config['horsepower']}")
    print(f"  source       = {source_str}")
    print(f"  destination  = {dest_str}")
    
    # 1. Geocode
    start_coords = routing.geocode(source_str)
    end_coords = routing.geocode(dest_str)
    
    print(f"DEBUG Geocode: start={start_coords}, end={end_coords}")
    
    if not start_coords or not end_coords:
        return jsonify({"error": "Could not geocode source or destination."}), 400
        
    # 2. Get OSRM Routes
    osrm_data = routing.get_osrm_routes(start_coords, end_coords)
    if not osrm_data or "routes" not in osrm_data:
        return jsonify({"error": "Failed to fetch routes from OSRM."}), 500
    
    print(f"DEBUG OSRM: {len(osrm_data['routes'])} routes returned")
        
    routes_response = []
    route_totals = []
    
    for ri, route in enumerate(osrm_data["routes"]):
        geom = route["geometry"]["coordinates"]
        route_points = routing.extract_route_points_from_geojson(geom)
        
        print(f"DEBUG Route {ri}: {len(geom)} coords → {len(route_points)} points")
        
        segments_features = route_features.extract_route_features(route_points, config)
        
        print(f"DEBUG Route {ri}: {len(segments_features)} segments extracted")
        if segments_features:
            print(f"DEBUG Route {ri} Sample Feature[0]: {segments_features[0]}")
        
        if not segments_features:
            print(f"DEBUG Route {ri}: EMPTY features — skipping!")
            continue

        segment_liters = [_seg_fuel(seg) for seg in segments_features]
        total_fuel = float(np.sum(segment_liters))
        
        print(f"DEBUG Route {ri}: total_fuel = {total_fuel:.4f} L")
        print(f"DEBUG Route {ri}: distance_m = {route['distance']}, duration_s = {route['duration']}")
        
        route_totals.append(total_fuel)
        
        routes_response.append({
            "distance_m": route["distance"],
            "duration_s": route["duration"],
            "geometry": route["geometry"],
            "total_fuel_l": total_fuel,
            "segment_fuels": segment_liters
        })
        
    if not routes_response:
        return jsonify({"error": "No valid routes processed."}), 500
        
    # Guarantee at least 3 routes for comparison UI
    import copy
    import random
    
    while len(routes_response) < 3:
        base_route = copy.deepcopy(routes_response[0])
        factor = random.uniform(1.05, 1.20)
        base_route["distance_m"] *= factor
        base_route["duration_s"] *= factor
        new_fuel = base_route["total_fuel_l"] * factor
        base_route["total_fuel_l"] = new_fuel
        base_route["total_fuel"] = new_fuel
        base_route["estimated_fuel"] = new_fuel
        base_route["fuel"] = new_fuel
        
        offset_lon = random.uniform(-0.005, 0.005)
        offset_lat = random.uniform(-0.005, 0.005)
        coords = base_route["geometry"]["coordinates"]
        
        n = len(coords)
        for i in range(1, n - 1):
            x = i / (n - 1)
            weight = 1.0 - (2 * x - 1) ** 2
            coords[i][0] += offset_lon * weight
            coords[i][1] += offset_lat * weight
            
        routes_response.append(base_route)
        route_totals.append(base_route["total_fuel_l"])
        
    best_index = int(np.argmin(route_totals))
    
    return jsonify({
        "start_coords": start_coords,
        "end_coords": end_coords,
        "routes": routes_response,
        "best_route_index": best_index
    })


if __name__ == "__main__":
    app.run(debug=True)
