from flask import Flask, request, jsonify, render_template
import numpy as np
import joblib


# LOAD MODEL & SCALER

model = joblib.load("fuel_model.pkl")
scaler = joblib.load("scaler.pkl")

print("Model and scaler loaded")

# INIT FLASK APP

app = Flask(__name__)


# HEALTH CHECK

@app.route("/")
def home():
    return "Load the frontend UI integration here "


# SINGLE SEGMENT PREDICTION


@app.route("/predict_segment", methods=["POST"])
def predict_segment():

    data = request.json

    features = data["features"]

    arr = np.array(features).reshape(1, -1)
    scaled = scaler.transform(arr)

    fuel = model.predict(scaled)[0]

    return jsonify({
        "predicted_fuel": float(fuel)
    })


# FULL ROUTE PREDICTION

@app.route("/predict_route", methods=["POST"])
def predict_route():

    data = request.json

    segments = data["segments"]   # list of feature vectors

    arr = np.array(segments)
    scaled = scaler.transform(arr)

    preds = model.predict(scaled)

    total_fuel = float(np.sum(preds))

    return jsonify({
        "segment_fuel": preds.tolist(),
        "total_fuel": total_fuel
    })

 
# MULTI ROUTE COMPARISON


@app.route("/compare_routes", methods=["POST"])
def compare_routes():

    data = request.json

    routes = data["routes"]  # list of routes → each route = list of segments

    route_results = []

    for route in routes:

        arr = np.array(route)
        scaled = scaler.transform(arr)

        preds = model.predict(scaled)
        total = float(np.sum(preds))

        route_results.append(total)

    best_index = int(np.argmin(route_results))

    return jsonify({
        "route_fuel": route_results,
        "best_route_index": best_index
    })


# RUN SERVER

if __name__ == "__main__":
    app.run(debug=True)
