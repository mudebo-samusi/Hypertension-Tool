# Import necessary libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Machine learning libraries
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Read the CSV file
data_path = 'E:/Hypertension-Tool/backend/Hypertension-risk-model-main.csv'
df = pd.read_csv(data_path)

# Show a summary of the data
print("First 5 records:")
print(df.head())
print("\nData description:")
print(df.describe())
print("\nData info:")
print(df.info())

# Check for missing values
missing = df.isnull().sum()
print("Missing values by column:")
print(missing)


# Histogram for numerical columns
num_cols = df.select_dtypes(include=['float64', 'int64']).columns

plt.figure(figsize=(15, 10))
for i, col in enumerate(num_cols, 1):
    plt.subplot(3, 3, i)
    sns.histplot(df[col], kde=True)
    plt.title(f'Distribution of {col}')
plt.tight_layout()
plt.show()

# Compute correlation matrix and plot heatmap
plt.figure(figsize=(12, 10))
corr = df.corr()
sns.heatmap(corr, annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Correlation Matrix')
plt.show()

# Example: Fill missing numeric values with median
for col in num_cols:
    if df[col].isnull().any():
        df[col].fillna(df[col].median(), inplace=True)


# Separate features and target
target_col = 'Risk'  # change this if your target variable has a different name
if target_col not in df.columns:
    raise ValueError(f"Target column '{target_col}' not found in data!")

X = df.drop(target_col, axis=1)
y = df[target_col]

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Training set: {X_train.shape}, Testing set: {X_test.shape}")

# Instantiate a Random Forest model
rf = RandomForestClassifier(random_state=42)

# Parameters for GridSearch
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [None, 5, 10],
    'min_samples_split': [2, 5]
}

# Setup Grid Search
grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=5, scoring='accuracy', n_jobs=-1)
grid_search.fit(X_train, y_train)

print("Best parameters found:", grid_search.best_params_)
best_rf = grid_search.best_estimator_

# Evaluate on test set
y_pred = best_rf.predict(X_test)
print("\nAccuracy on test set:", accuracy_score(y_test, y_pred))
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['No Hypertension', 'Hypertension'], yticklabels=['No Hypertension', 'Hypertension'])
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.title('Confusion Matrix')
plt.show()

# Plot feature importances
importances = best_rf.feature_importances_
indices = np.argsort(importances)[::-1]
feature_names = X.columns

plt.figure(figsize=(12, 6))
plt.title("Feature Importances")
sns.barplot(x=importances[indices], y=feature_names[indices])
plt.xlabel("Relative Importance")
plt.ylabel("Feature")
plt.show()

from joblib import dump, load
from sklearn.preprocessing import LabelEncoder

# Save the model to a file
model_path = 'best_rf_model.joblib'
dump(best_rf, model_path)
print(f"Model saved to {model_path}")

# Load the model from the file
loaded_model = load(model_path)
print("Model loaded successfully")
# Encode the target variable
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Save the label encoder to a file
encoder_path = 'label_encoder_model_1.joblib'
dump(label_encoder, encoder_path)
print(f"Label encoder saved to {encoder_path}")

# Load the label encoder from the file
loaded_encoder = load(encoder_path)
print("Label encoder loaded successfully")