import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load the extended 100-row dataset
df = pd.read_csv("C:\\Users\\HP\\OneDrive\\Documents\\software engineering\\project\\fireguard_dataset.csv")

# ---------------------------
# DATA CLEANING
# ---------------------------

# Check for null values and fill/drop as necessary
df_cleaned = df.copy()
df_cleaned.fillna({
    'CropLoss_USD': 0,
    'LivestockLoss_USD': 0,
    'IrrigationDamage_USD': 0,
    'TourismRevenueLoss_USD': 0,
    'AidReceived_USD': 0,
    'InsurancePayout_USD': 0
}, inplace=True)

# Fixed date parsing for DD-MM-YYYY format
df_cleaned['StartDate'] = pd.to_datetime(df_cleaned['StartDate'], dayfirst=True)
df_cleaned['EndDate'] = pd.to_datetime(df_cleaned['EndDate'], dayfirst=True)

# ---------------------------
# FEATURE ENGINEERING
# ---------------------------

# Total Agricultural Loss
df_cleaned['TotalAgriLoss_USD'] = (
    df_cleaned['CropLoss_USD'] + 
    df_cleaned['LivestockLoss_USD'] + 
    df_cleaned['IrrigationDamage_USD']
)

# Total Infrastructure Loss
df_cleaned['InfraLoss_USD'] = (
    df_cleaned['RoadDamage_USD'] + 
    df_cleaned['PowerLineDamage_USD'] +
    df_cleaned['BuildingDamage_USD'] +
    df_cleaned['TimberLoss_USD']
)

# Total Environmental Cost
df_cleaned['EnvironmentalCost_USD'] = (
    df_cleaned['ReforestationCost_USD'] + 
    df_cleaned['HealthCost_USD']
)

# Actual vs Predicted difference
df_cleaned['LossDeviation_USD'] = (
    df_cleaned['ActualEconomicLoss_USD'] - df_cleaned['PredictedEconomicLoss_USD']
)

# Damage to Support Ratio
df_cleaned['SupportRatio'] = (
    (df_cleaned['AidReceived_USD'] + df_cleaned['InsurancePayout_USD']) /
    df_cleaned['ActualEconomicLoss_USD']
).round(2)

# ---------------------------
# TARGET VARIABLE
# ---------------------------
# The main target for ML model could be 'ActualEconomicLoss_USD'

# Save the prepared dataset
prepared_path = "C:\\Users\\HP\\OneDrive\\Documents\\software engineering\\project\\fireguard_prepared_dataset.csv"
df_cleaned.to_csv(prepared_path, index=False)
print(f"Dataset prepared and saved at: {prepared_path}")

# ---------------------------
# ENCODING
# ---------------------------

df_prepared = pd.read_csv(prepared_path)

# Identify categorical columns (excluding FireID, StartDate, EndDate)
categorical_cols = df_prepared.select_dtypes(include=['object']).columns.tolist()
categorical_cols = [col for col in categorical_cols if col not in ['FireID', 'StartDate', 'EndDate']]

print("\nCategorical Columns to Encode (excluding FireID, StartDate, EndDate):")
print(categorical_cols)

# One-hot encode the selected categorical columns
df_encoded = pd.get_dummies(df_prepared, columns=categorical_cols, drop_first=False)

# Convert boolean values to integers (0 and 1)
df_encoded = df_encoded.astype(int, errors='ignore')

# ---------------------------
# 📊 DATA VISUALIZATION
# ---------------------------

# Histogram of Actual Economic Loss
sns.set(style="whitegrid")
plt.figure(figsize=(8, 5))
sns.histplot(df_cleaned['ActualEconomicLoss_USD'], kde=True, bins=30)
plt.title("Distribution of Actual Economic Loss")
plt.xlabel("Loss (USD)")
plt.ylabel("Frequency")
plt.grid(True)
plt.tight_layout()
plt.show()


#Box plot 
loss_columns = [
    'CropLoss_USD', 'LivestockLoss_USD', 'IrrigationDamage_USD',
    'RoadDamage_USD', 'BuildingDamage_USD', 'PowerLineDamage_USD',
    'ReforestationCost_USD', 'HealthCost_USD'
]

df_loss = df_encoded[loss_columns]

plt.figure(figsize=(12, 6))
sns.boxplot(data=df_loss, palette='Set3')
plt.title("Boxplot of Loss Components")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# Correlation Heatmap
plt.figure(figsize=(12, 8))
corr = df_cleaned.corr(numeric_only=True)
sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".1f")
plt.title("Correlation Heatmap of Economic Indicators")
plt.tight_layout()
plt.show()

# Scatter plot: Predicted vs Actual
plt.figure(figsize=(6, 4))
sns.scatterplot(data=df_cleaned, x='PredictedEconomicLoss_USD', y='ActualEconomicLoss_USD')
plt.plot([df_cleaned['PredictedEconomicLoss_USD'].min(), df_cleaned['PredictedEconomicLoss_USD'].max()],
         [df_cleaned['PredictedEconomicLoss_USD'].min(), df_cleaned['PredictedEconomicLoss_USD'].max()],
         color='red', linestyle='--', label='Ideal Prediction')
plt.title("Predicted vs Actual Economic Loss")
plt.xlabel("Predicted Loss")
plt.ylabel("Actual Loss")
plt.legend()
plt.tight_layout()
plt.show()

# Save the encoded dataset
encoded_path = "C:\\Users\\HP\\OneDrive\\Documents\\software engineering\\project\\fireguard_enocded_dataset.csv"
df_encoded.to_csv(encoded_path, index=False)
print(f"\nEncoded dataset saved at: {encoded_path}")