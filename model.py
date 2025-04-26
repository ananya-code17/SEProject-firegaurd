import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score, classification_report
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor, XGBClassifier
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from imblearn.over_sampling import SMOTE

from statsmodels.tsa.arima.model import ARIMA
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, LSTM, Dense
import warnings
warnings.filterwarnings("ignore")


# ------------------ Load and Preprocess Dataset ------------------
df = pd.read_csv("fireguard_encoded_dataset.csv")
start_dates = df['StartDate']  # Save StartDate for time series
df = df.drop(columns=['FireID', 'StartDate', 'EndDate'])  # Drop non-usable columns

# ------------------ REGRESSION: Predicting Economic Loss ------------------
X_reg = df.drop(columns=['ActualEconomicLoss_USD', 'FireSeverityIndex'])
y_reg = df['ActualEconomicLoss_USD']

X_train, X_test, y_train, y_test = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

models = {
    "Linear Regression": LinearRegression(),
    "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
    "XGBoost": XGBRegressor(n_estimators=100, random_state=42)
}

r2_gb = None

def evaluate_model(name, model, X_test, y_test):
    global r2_gb
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\n--- {name} ---")
    print(f"MSE: {mse:.2f}, RMSE: {rmse:.2f}, MAE: {mae:.2f}, R² Score: {r2:.2f}")

    if name == "Gradient Boosting":
        r2_gb = r2

for name, model in models.items():
    model.fit(X_train, y_train)
    evaluate_model(name, model, X_test, y_test)

print(f"\n✅ Gradient Boosting R² Score: {r2_gb:.2f} — selected for forecasting.\n")

# ------------------ CLASSIFICATION: Predicting FireSeverityIndex ------------------
X_fsi = df.drop(columns=['FireSeverityIndex', 'ActualEconomicLoss_USD'])
y_fsi = df['FireSeverityIndex']

le = LabelEncoder()
y_encoded = le.fit_transform(y_fsi)

X_bal, y_bal = SMOTE(random_state=42).fit_resample(X_fsi, y_encoded)
X_train_fsi, X_test_fsi, y_train_fsi, y_test_fsi = train_test_split(X_bal, y_bal, test_size=0.2, random_state=42)

xgb_clf = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
xgb_clf.fit(X_train_fsi, y_train_fsi)
y_pred = xgb_clf.predict(X_test_fsi)

# Classification Report
y_pred_labels = le.inverse_transform(y_pred)
y_test_labels = le.inverse_transform(y_test_fsi)

accuracy = accuracy_score(y_test_labels, y_pred_labels)
print("\n--- Fire Severity Index Classification ---")
print(f"Accuracy: {accuracy:.2f}")
print(classification_report(y_test_labels, y_pred_labels))

# Sample Strategy
print("\nSample Resource Allocation Based on Predicted FSI:")
for pred in y_pred_labels[:5]:
    if pred >= 8:
        strategy = "🔴 Full Emergency Response + Evacuation"
    elif pred >= 7:
        strategy = "🟠 Moderate Response Team"
    else:
        strategy = "🟢 Monitor Only"
    print(f"Predicted FSI: {pred} => {strategy}")

# ------------------ TIME-SERIES FORECASTING: Economic Loss ------------------

print("\n Time-Series Forecasting of Economic Loss")

# Create a new DataFrame for time-series forecasting
df_ts = pd.DataFrame({
    'StartDate': pd.to_datetime(start_dates),
    'ActualEconomicLoss_USD': df['ActualEconomicLoss_USD']
}).dropna()

df_ts.set_index('StartDate', inplace=True)
df_monthly = df_ts.resample('M').sum()

# ------- ARIMA Forecast -------
print("\n ARIMA Forecast:")
model_arima = ARIMA(df_monthly, order=(1, 1, 1))
arima_result = model_arima.fit()
forecast_arima = arima_result.forecast(steps=6)
print(forecast_arima)

# ------- LSTM Forecast -------
print("\n LSTM Forecast:")
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

# Predict next 6 months
last_seq = scaled_loss[-3:]
predictions = []
for _ in range(6):
    input_seq = last_seq.reshape((1, 3, 1))
    pred = model_lstm.predict(input_seq, verbose=0)
    predictions.append(pred[0, 0])
    last_seq = np.append(last_seq[1:], pred).reshape(3, 1)
predicted_loss = scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
print(predicted_loss.flatten())

