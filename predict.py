import requests

base_url = "http://127.0.0.1:8000"

# Common feature payload for prediction
features = {
    "DurationDays": 19,
    "AreaBurned_ha": 1599,
    "SuppressionCost_USD": 8901927,
    "CropLoss_USD": 3869927,
    "LivestockLoss_USD": 23907,
    "IrrigationDamage_USD": 38222,
    "RoadDamage_USD": 704267,
    "PowerLineDamage_USD": 755019,
    "BuildingDamage_USD": 1138610,
    "TimberLoss_USD": 454367,
    "ReforestationCost_USD": 1367017,
    "AirQualityIndexChange": 50,
    "HospitalVisits": 565,
    "RespiratoryCases": 350,
    "HealthCost_USD": 687807,
    "TourismRevenueLoss_USD": 3249886,
    "BusinessClosures": 57,
    "EmploymentLoss": 173,
    "RecoveryTime_Months": 26,
    "AidReceived_USD": 4276955,
    "InsurancePayout_USD": 4561732,
    "PredictedEconomicLoss_USD": 21128827,
    "TotalAgriLoss_USD": 3932056,
    "InfraLoss_USD": 3052263,
    "EnvironmentalCost_USD": 2054824,
    "LossDeviation_USD": 1653282,
    "SupportRatio": 0,
    "Location_Arizona": 0,
    "Location_Colorado": 0,
    "Location_Nevada": 0,
    "Location_New South Wales": 0,
    "Location_Northern California": 0,
    "Location_Oregon": 0,
    "Location_Queensland": 1,
    "Location_Texas": 0,
    "Location_Utah": 0,
    "Location_Western Australia": 0,
    "Cause_Human": 0,
    "Cause_Lightning": 1,
    "RecoveryRecommendations_Create shelter zones, upgrade medical facilities": 0,
    "RecoveryRecommendations_Enhance evacuation routes, support forest regeneration": 0,
    "RecoveryRecommendations_Expand insurance coverage, reinforce grid infrastructure": 0,
    "RecoveryRecommendations_Improve rural fire stations, subsidies for affected families": 0,
    "RecoveryRecommendations_Invest in smart fire detection systems": 0,
    "RecoveryRecommendations_Job programs, rebuild housing, upgrade health facilities": 1,
    "RecoveryRecommendations_Rehabilitate tourism, replant forests, improve readiness": 0,
    "RecoveryRecommendations_Subsidize farmers, rebuild irrigation, invest in air filters": 0,
    "RecoveryRecommendations_Subsidize tourism revival, offer SME recovery grants": 0,
    "RecoveryRecommendations_Support local hiring, rebuild eco-tourism infrastructure": 0
}

# Function to handle responses safely
def print_response(response, title):
    print(f"\n{title}:")
    try:
        print(response.json())
    except Exception as e:
        print("❌ Error parsing response:")
        print("Raw Response:", response.text)
        print("Error Message:", str(e))

# 1. Economic Loss Prediction
loss_resp = requests.post(f"{base_url}/predict-loss", json={"features": features})
print_response(loss_resp, "Economic Loss Prediction")

# 2. Fire Severity Classification
fsi_resp = requests.post(f"{base_url}/predict-fsi", json={"features": features})
print_response(fsi_resp, "Fire Severity Classification")

# 3. ARIMA Forecast
arima_resp = requests.get(f"{base_url}/forecast-loss-arima")
print_response(arima_resp, "Time-Series Forecasted Loss (ARIMA)")

# 4. LSTM Forecast
lstm_resp = requests.get(f"{base_url}/forecast-loss-lstm")
print_response(lstm_resp, "Time-Series Forecasted Loss (LSTM)")