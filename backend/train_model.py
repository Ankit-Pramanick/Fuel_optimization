import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
import joblib

# LOAD DATASET
base_path = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(base_path, "indian_iov_fuel_dataset.csv"))

print("Dataset loaded:", df.shape)

# SELECT FEATURES
features_final = [
    "Speed_kmh",
    "Acceleration_ms2",
    "Slope_deg",
    "Distance_km",
    "Congestion",
    "Temperature_C",
    "StopGoFrequency",
    "EngineLoad_pct",
    "Horsepower"
]

target = "FuelRate_Lph"

df = df[features_final + [target]].dropna()

X = df[features_final]
y = df[target]

# SPLIT
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# SCALE
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 1. TRAIN RANDOM FOREST
print("\n--- Training Random Forest ---")
rf_model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42)
rf_model.fit(X_train_scaled, y_train)

rf_preds = rf_model.predict(X_test_scaled)
print("RF R2 Score:", r2_score(y_test, rf_preds))
print("RF MAE:", mean_absolute_error(y_test, rf_preds))
print("RF RMSE:", np.sqrt(mean_squared_error(y_test, rf_preds)))

# 2. TRAIN XGBOOST
print("\n--- Training XGBoost ---")
xgb_model = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
xgb_model.fit(X_train_scaled, y_train)

xgb_preds = xgb_model.predict(X_test_scaled)
print("XGB R2 Score:", r2_score(y_test, xgb_preds))
print("XGB MAE:", mean_absolute_error(y_test, xgb_preds))
print("XGB RMSE:", np.sqrt(mean_squared_error(y_test, xgb_preds)))

# SAVE MODELS
joblib.dump(rf_model, os.path.join(base_path, "fuel_model.pkl"))
joblib.dump(xgb_model, os.path.join(base_path, "xgboost_model.pkl"))
joblib.dump(scaler, os.path.join(base_path, "scaler.pkl"))

print("\nModels saved successfully.")
