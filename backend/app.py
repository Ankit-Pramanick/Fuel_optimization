from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib

app = Flask(__name__, template_folder='../templates', static_folder='../static')
CORS(app)

# LOAD MODEL

model = joblib.load("fuel_model.pkl")
scaler = joblib.load("scaler.pkl")

print("Model loaded")


# PAGE ROUTES (for UI)

@app.route("/")
def home():
    return render_template("index.html")


# ML PREDICTION APIs

# 1. Single Segment Prediction
# Frontend sends: { "features": [f1, f2, ..., f9] }
# Frontend expects: { "predicted_fuel": 1.23 }

@app.route("/predict_segment", methods=["POST"])
def predict_segment():
    data = request.json
    features = data["features"]

    arr = np.array([features])           # shape (1, N)
    scaled = scaler.transform(arr)
    pred = model.predict(scaled)

    return jsonify({
        "predicted_fuel": float(pred[0])
    })


# 2. Full Route Prediction
# Frontend sends: { "segments": [[f1..f9], [f1..f9], ...] }
# Frontend expects: { "total_fuel": X, "segment_fuel": [x1, x2, ...] }

@app.route("/predict_route", methods=["POST"])
def predict_route():
    data = request.json
    segments = data["segments"]

    arr = np.array(segments)
    scaled = scaler.transform(arr)

    preds = model.predict(scaled)
    total = float(np.sum(preds))

    return jsonify({
        "segment_fuel": preds.tolist(),
        "total_fuel": total
    })


# 3. Compare Routes
# Frontend sends: { "routes": [[[seg1], [seg2]], [[seg1], [seg2]]] }
# Frontend expects: { "route_fuel": [X, Y], "best_route_index": N }

@app.route("/compare_routes", methods=["POST"])
def compare_routes():
    data = request.json
    routes = data["routes"]   # list of routes, each route is a list of segments

    route_totals = []

    for route_segments in routes:
        arr = np.array(route_segments)
        scaled = scaler.transform(arr)
        preds = model.predict(scaled)
        route_totals.append(float(np.sum(preds)))

    best_index = int(np.argmin(route_totals))   # lowest fuel = most efficient

    return jsonify({
        "route_fuel": route_totals,
        "best_route_index": best_index
    })


########################

if __name__ == "__main__":
    app.run(debug=True)
