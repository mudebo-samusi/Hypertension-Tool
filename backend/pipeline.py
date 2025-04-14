import joblib
import pandas as pd
import numpy as np
import os
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier

class HypertensionPipeline:
    def __init__(self):
        # Paths to save the trained models
        self.model_dir = 'E:/Hypertension-Tool/backend'
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.lr_model_path = os.path.join(self.model_dir, 'logistic_regression_model.joblib')  # Fix path
        self.gb_model_path = os.path.join(self.model_dir, 'gradient_boosting_model.joblib')  # Fix path
        self.rf_model_path = os.path.join(self.model_dir, 'random_forest_model.joblib')  # Fix path
        
        self.rf_encoder_path = os.path.join(self.model_dir, 'label_encoder_model_1.joblib')
        self.gb_encoder_path = os.path.join(self.model_dir, 'label_encoder_model_2.joblib')
        self.lr_encoder_path = os.path.join(self.model_dir, 'label_encoder_model_2.joblib')  # LR uses same encoder as GB
    
        # Initialize the models
        self.lr_model = None
        self.gb_model = None
        self.rf_model = None

        # Initialize the label encoders
        self.gb_encoder = None
        self.rf_encoder = None
        self.lr_encoder = None  # Added encoder for logistic regression

        self.models_loaded = False  # Initialize models_loaded to False
    
    def load_models(self):
        """Load all trained models and label encoders from disk"""
        try:
            if os.path.exists(self.lr_model_path):
                self.lr_model = joblib.load(self.lr_model_path)
            else:
                print(f"Logistic Regression model not found at {self.lr_model_path}")
                
            if os.path.exists(self.gb_model_path):
                self.gb_model = joblib.load(self.gb_model_path)
            else:
                print(f"Gradient Boosting model not found at {self.gb_model_path}")
                
            if os.path.exists(self.rf_model_path):
                self.rf_model = joblib.load(self.rf_model_path)
            else:
                print(f"Random Forest model not found at {self.rf_model_path}")
                
            if os.path.exists(self.gb_encoder_path):
                self.gb_encoder = joblib.load(self.gb_encoder_path)
            else:
                print(f"Gradient Boosting encoder not found at {self.gb_encoder_path}")
                
            if os.path.exists(self.rf_encoder_path):
                self.rf_encoder = joblib.load(self.rf_encoder_path)
            else:
                print(f"Random Forest encoder not found at {self.rf_encoder_path}")
                
            if os.path.exists(self.lr_encoder_path):
                self.lr_encoder = joblib.load(self.lr_encoder_path)
            else:
                print(f"Logistic Regression encoder not found at {self.lr_encoder_path}")
                
            if not (self.lr_model and self.gb_model and self.rf_model):
                print("Some models were not found. Please ensure all models are saved.")
                return False
            
            if not (self.gb_encoder and self.rf_encoder and self.lr_encoder):
                print("Some label encoders were not found. Please ensure all encoders are saved.")
                return False
            
            self.models_loaded = True  # Set models_loaded to True if all models and encoders are loaded
            return True
        except Exception as e:
            print(f"Error loading models or encoders: {str(e)}")
            return False

    def get_hypertension_category(self, systolic, diastolic):
        """
        Determine hypertension category based on blood pressure values.
        
        Args:
            systolic (float): Systolic blood pressure value
            diastolic (float): Diastolic blood pressure value
            
        Returns:
            str: Category of hypertension
        """
        if systolic < 120 and diastolic < 80:
            return "Normal"
        elif (120 <= systolic < 130) and diastolic < 80:
            return "Elevated"
        elif (130 <= systolic < 140) or (80 <= diastolic < 90):
            return "Stage 1 Hypertension"
        elif (systolic >= 140) or (diastolic >= 90):
            return "Stage 2 Hypertension"
        elif systolic >= 180 or diastolic >= 120:
            return "Hypertensive Crisis"
        return "Unknown"
    
    def predict(self, input_data):
        """
        Predict hypertension using all models and return a combined result
        """
        # Check if input data is valid
        if not input_data or not isinstance(input_data, (dict, pd.DataFrame)):
            return {"error": "Invalid input data"}

        # Ensure models are loaded
        if not self.models_loaded:
            self.models_loaded = self.load_models()
            if not self.models_loaded:
                return {"error": "Models not loaded properly"}

        # Format input data
        features = ['Systolic_BP', 'Diastolic_BP', 'Heart_Rate']
        if isinstance(input_data, dict):
            # Rename keys if needed
            formatted_data = {
                'Systolic_BP': float(input_data.get('systolic', input_data.get('Systolic_BP', 0))),
                'Diastolic_BP': float(input_data.get('diastolic', input_data.get('Diastolic_BP', 0))),
                'Heart_Rate': float(input_data.get('heart_rate', input_data.get('Heart_Rate', 0)))
            }
            input_df = pd.DataFrame([formatted_data])
        else:
            input_df = input_data

        # Ensure all required features are present
        for feature in features:
            if feature not in input_df.columns:
                return {"error": f"Missing required feature: {feature}"}

        # Get predictions from each model
        results = {}
        
        if self.lr_model:
            lr_pred = self.lr_model.predict(input_df)[0]
            lr_prob = self.lr_model.predict_proba(input_df)[0][1] if hasattr(self.lr_model, 'predict_proba') else None
            results['logistic_regression'] = {'prediction': int(lr_pred), 'probability': float(lr_prob) if lr_prob is not None else None}
            
        if self.gb_model:
            gb_pred = self.gb_model.predict(input_df)[0]
            gb_prob = self.gb_model.predict_proba(input_df)[0][1] if hasattr(self.gb_model, 'predict_proba') else None
            results['gradient_boosting'] = {'prediction': int(gb_pred), 'probability': float(gb_prob) if gb_prob is not None else None}
            
        if self.rf_model:
            rf_pred = self.rf_model.predict(input_df)[0]
            rf_prob = self.rf_model.predict_proba(input_df)[0][1] if hasattr(self.rf_model, 'predict_proba') else None
            results['random_forest'] = {'prediction': int(rf_pred), 'probability': float(rf_prob) if rf_prob is not None else None}
        
        # Combine results using majority voting
        predictions = [
            results.get('logistic_regression', {}).get('prediction', None),
            results.get('gradient_boosting', {}).get('prediction', None),
            results.get('random_forest', {}).get('prediction', None)
        ]
        
        # Remove None values
        predictions = [p for p in predictions if p is not None]
        
        # Calculate average probability if available
        probabilities = [
            results.get('logistic_regression', {}).get('probability', None),
            results.get('gradient_boosting', {}).get('probability', None),
            results.get('random_forest', {}).get('probability', None)
        ]
        
        # Remove None values
        probabilities = [p for p in probabilities if p is not None]
        avg_probability = sum(probabilities) / len(probabilities) if probabilities else None
        
        # Final prediction is majority vote
        if predictions:
            final_prediction = 1 if sum(predictions) / len(predictions) >= 0.5 else 0
        else:
            final_prediction = None
            
        results['final_prediction'] = {
            'prediction': final_prediction,
            'probability': avg_probability,
            'prediction_text': 'Hypertension' if final_prediction == 1 else 'No Hypertension' if final_prediction == 0 else 'Unknown'
        }

        # Determine risk level based on probability
        risk_level = 'High' if avg_probability and avg_probability > 0.75 else \
                    'Moderate' if avg_probability and avg_probability > 0.5 else 'Low'

        # Get BP category
        try:
            systolic = float(input_df['Systolic_BP'].iloc[0])
            diastolic = float(input_df['Diastolic_BP'].iloc[0])
            bp_category = self.get_hypertension_category(systolic, diastolic)
        except (ValueError, TypeError, IndexError):
            bp_category = 'Unknown'

        # Add additional information to results
        results['final_prediction'] = {
            'prediction': final_prediction,
            'prediction_text': 'Hypertension' if final_prediction == 1 else 'No Hypertension' if final_prediction == 0 else 'Unknown',
            'probability': avg_probability,
            'confidence': f"{avg_probability * 100:.2f}%" if avg_probability is not None else 'Unknown'
        }

        results['additional_info'] = {
            'risk_level': risk_level,
            'recommendation': self.get_recommendation(risk_level, bp_category),
            'bp_category': bp_category
        }

        return results

    def get_recommendation(self, risk_level, bp_category):
        """Generate recommendation based on risk level and BP category"""
        if risk_level == 'High':
            return 'Urgent: Consult a healthcare provider immediately'
        elif risk_level == 'Moderate':
            return 'Schedule an appointment with your healthcare provider'
        else:
            return 'Continue monitoring your blood pressure and maintain a healthy lifestyle'

# Example usage
if __name__ == "__main__":
    # Create the pipeline
    pipeline = HypertensionPipeline()
    prediction = pipeline.predict()
    print(prediction)
