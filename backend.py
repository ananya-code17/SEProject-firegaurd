from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import joblib

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor, XGBClassifier
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split

from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import LSTM, Dense # type: ignore
from statsmodels.tsa.arima.model import ARIMA
from flask_cors import CORS

import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app) 

# ---------------- Load Data and Models ----------------
df = pd.read_csv("fireguard_encoded_dataset.csv")
start_dates = df['StartDate']
df = df.drop(columns=['FireID', 'StartDate', 'EndDate'])

# Regression Data Preparation
target_loss = 'ActualEconomicLoss_USD'
X_regression = df.drop(columns=[target_loss, 'FireSeverityIndex'])
y_regression = df[target_loss]
X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(X_regression, y_regression, test_size=0.2, random_state=42)

# Train Gradient Boosting for Economic Loss
gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
gb_model.fit(X_train_reg, y_train_reg)

# Classification Data Preparation
target_fsi = df['FireSeverityIndex']
features_fsi = df.drop(columns=['FireSeverityIndex', 'ActualEconomicLoss_USD'])
le = LabelEncoder()
y_encoded = le.fit_transform(target_fsi)

smote = SMOTE(random_state=42)
X_balanced, y_balanced = smote.fit_resample(features_fsi, y_encoded)
X_train_fsi, X_test_fsi, y_train_fsi, y_test_fsi = train_test_split(X_balanced, y_balanced, test_size=0.2, random_state=42)

# Train XGBoost Classifier for Fire Severity Index
xgb_clf = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
xgb_clf.fit(X_train_fsi, y_train_fsi)

# Time Series Preparation
df_ts = pd.DataFrame({
    'StartDate': pd.to_datetime(start_dates),
    'ActualEconomicLoss_USD': df['ActualEconomicLoss_USD']
}).dropna()
df_ts.set_index('StartDate', inplace=True)
df_monthly = df_ts.resample('M').sum()

# ARIMA Model
arima_model = ARIMA(df_monthly, order=(1, 1, 1)).fit()

# LSTM Model
scaler = MinMaxScaler()
scaled_loss = scaler.fit_transform(df_monthly.values)

X_lstm, y_lstm = [], []
for i in range(3, len(scaled_loss)):
    X_lstm.append(scaled_loss[i-3:i])
    y_lstm.append(scaled_loss[i])
X_lstm, y_lstm = np.array(X_lstm), np.array(y_lstm)

model_lstm = Sequential([
    LSTM(50, activation='relu', input_shape=(X_lstm.shape[1], 1)),
    Dense(1)
])
model_lstm.compile(optimizer='adam', loss='mse')
model_lstm.fit(X_lstm, y_lstm, epochs=50, verbose=0)

# ---------------- Routes ----------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Wildfire Economic and Severity Prediction API"})

@app.route("/predict-loss", methods=["POST"])
def predict_loss():
    try:
        input_data = request.json.get("features")
        input_df = pd.DataFrame([input_data])
        prediction = gb_model.predict(input_df)[0]
        return jsonify({"predicted_economic_loss_usd": round(float(prediction), 2)})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/predict-fsi", methods=["POST"])
def predict_fsi():
    try:
        input_data = request.json.get("features")
        input_df = pd.DataFrame([input_data])
        encoded_pred = xgb_clf.predict(input_df)[0]
        decoded_pred = le.inverse_transform([encoded_pred])[0]

        response = "Monitor Only"
        if decoded_pred >= 8:
            response = "Full Emergency Response + Evacuation"
        elif decoded_pred >= 7:
            response = "Moderate Response Team"

        return jsonify({
            "predicted_fsi": int(decoded_pred),
            "suggested_response": response
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/forecast-loss-arima", methods=["GET"])
def forecast_loss_arima():
    try:
        forecast = arima_model.forecast(steps=6)
        forecast_list = forecast.values.flatten().tolist()
        return jsonify({"forecast_next_6_months_usd": [round(val, 2) for val in forecast_list]})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/forecast-loss-lstm", methods=["GET"])
def forecast_loss_lstm():
    try:
        last_seq = scaled_loss[-3:]
        last_seq = last_seq.reshape((1, 3, 1))

        predictions_scaled = []
        for _ in range(6):
            pred = model_lstm.predict(last_seq, verbose=0)
            predictions_scaled.append(pred[0, 0])
            last_seq = np.append(last_seq[:, 1:, :], pred.reshape(1, 1, 1), axis=1)

        predicted_loss = scaler.inverse_transform(np.array(predictions_scaled).reshape(-1, 1)).flatten()
        return jsonify({"forecast": predicted_loss.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)})

# ---------------- Main Entry ----------------
if __name__ == "__main__":
    app.run(debug=True)