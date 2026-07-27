# AI-Based Fuel-Efficient Route Optimization System using Internet of Vehicles (IoV)

A machine learning-powered eco-routing navigation system that recommends the most fuel-efficient route between two locations. By combining vehicle parameters, driving behavior, terrain slope (elevation), and real-time traffic conditions, the system predicts fuel consumption (L/hr) for route segments and selects the route that minimizes fuel usage.

## Key Features

*   **Smart Navigation & Routing**: Integrates **OpenStreetMap (OSM)** and **OSRM (Open Source Routing Machine)** to generate multiple candidate routes between any start and destination point.
*   **Driver & Vehicle Profiling**: Allows customization of vehicle horsepower, load percentage, A/C temperature, driving acceleration, and speed limit.
*   **Terrain-Aware Modeling**: Batches coordinates and queries the **NASA SRTM Elevation Dataset** (via OpenTopoData API) to calculate the precise slope/gradient of each segment.
*   **Traffic-Aware Adjustments**: Simulates congestion levels and stop-and-go frequencies based on the time of day (rush hour vs. off-peak).
*   **XGBoost ML Core**: Uses a trained XGBoost Regressor model ($R^2 = 0.90$) to predict fuel consumption on a segment-by-segment basis.
*   **Interactive Web UI**: Built with HTML, Tailwind CSS, Javascript, and the Google Maps JavaScript API for dynamic route rendering, charts, and metrics (Liters, Time, Distance, CO₂ emissions, and Eco-Score).

---

## Tech Stack

*   **Backend**: Python, Flask, Flask-CORS
*   **Machine Learning**: XGBoost, Scikit-learn, Joblib, Pandas, NumPy
*   **APIs & Maps**: OpenStreetMap (OSM), OSRM, Nominatim Geocoding API, OpenTopoData (NASA SRTM 90m), Google Maps JS API
*   **Frontend**: HTML5, Vanilla JS, Tailwind CSS, Inter Font

---

## Project Structure

```
├── backend/
│   ├── app.py                     # Main Flask Application & endpoints
│   ├── routing.py                 # OSM Geocoding & Route fetch utilities
│   ├── elevation.py               # SRTM elevation data fetching (OpenTopoData API)
│   ├── traffic.py                 # Time-of-day traffic congestion simulator
│   ├── route_features.py          # Builds feature vectors for segment predictions
│   ├── train_model.py             # Script to train XGBoost & Random Forest models
│   ├── generate_dataset.py        # Generates the physics-based synthetic dataset
│   ├── xgboost_model.pkl          # Trained XGBoost model (Production)
│   ├── scaler.pkl                 # StandardScaler object for feature scaling
│   ├── indian_iov_fuel_dataset.csv# Preprocessed dataset
│   └── Results_and_Accuracy.pdf   # Detailed model training metrics and analysis
├── templates/
│   └── index.html                 # Main frontend dashboard
├── static/
│   ├── css/style.css              # Custom styling / overrides
│   └── js/app.js                  # Frontend UI logic, API calls, and Google Maps drawing
├── requirements.txt               # Main dependencies list for deployment
├── .gitignore                     # Git ignore rules
```

---

Live Demo: 
