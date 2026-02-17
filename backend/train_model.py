import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error
import joblib

# LOAD DATASET

df = pd.read_csv("indian_iov_fuel_dataset.csv")

print("Dataset loaded:", df.shape)

# SELECT FEATURES

features = [
    "Speed_kmh",
    "Acceleration_ms2",
    "EngineLoad_pct",
    "Congestion",
    "TrafficSignals",
    "StopGoFrequency",
    "Temperature_C",
    "Horsepower (HP)"
]

target = "FuelRate_Lph"

df = df[features + [target]].dropna()

# ADD DEMO SAFE FEATURES

# Simulated slope + distance (for backend use)
df["slope"] = np.random.uniform(-5, 5, len(df))
df["distance"] = np.random.uniform(0.1, 2.0, len(df))

features_final = [
    "Speed_kmh",
    "Acceleration_ms2",
    "slope",
    "distance",
    "Congestion",
    "Temperature_C",
    "StopGoFrequency",
    "EngineLoad_pct",
    "Horsepower (HP)"
]

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

# TRAIN MODEL

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    random_state=42
)

model.fit(X_train_scaled, y_train)

# EVALUATE

preds = model.predict(X_test_scaled)

print("R2 Score:", r2_score(y_test, preds))
print("MAE:", mean_absolute_error(y_test, preds))

# SAVE MODEL

joblib.dump(model, "fuel_model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("Model saved successfully")
