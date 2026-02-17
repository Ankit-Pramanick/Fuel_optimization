from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib

app = Flask(__name__)
CORS(app)

# LOAD MODEL

model = joblib.load("fuel_model.pkl")
scaler = joblib.load("scaler.pkl")

print("Model loaded")


# PAGE ROUTES (for UI)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/route")
def route_page():
    return render_template("route.html")

@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


# ML PREDICTION API

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


########################

if __name__ == "__main__":
    app.run(debug=True)
