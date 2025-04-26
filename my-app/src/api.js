// api.js - Connection between React frontend and Flask backend

const API_BASE_URL = 'http://localhost:5000';

/**
 * Predicts economic loss based on input features
 * @param {Object} features - Features for prediction
 * @returns {Promise} - Promise with prediction results
 */
export const predictEconomicLoss = async (features) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-loss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received economic loss prediction:", data);
    return data;
  } catch (error) {
    console.error('Error predicting economic loss:', error);
    throw error;
  }
};

/**
 * Predicts fire severity index based on input features
 * @param {Object} features - Features for prediction
 * @returns {Promise} - Promise with prediction results
 */
export const predictFireSeverity = async (features) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-fsi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received fire severity prediction:", data);
    return data;
  } catch (error) {
    console.error('Error predicting fire severity:', error);
    throw error;
  }
};

/**
 * Gets ARIMA forecast for economic loss
 * @returns {Promise} - Promise with forecast results
 */
export const forecastLossArima = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/forecast-loss-arima`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ARIMA forecast:', error);
    throw error;
  }
};

/**
 * Gets LSTM forecast for economic loss
 * @returns {Promise} - Promise with forecast results
 */
export const forecastLossLstm = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/forecast-loss-lstm`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching LSTM forecast:', error);
    throw error;
  }
};

/**
 * Utility function to handle API errors with fallback
 * @param {Function} apiCall - API function to call
 * @param {Function} fallback - Fallback function if API fails
 * @returns {Promise} - Promise resolving to API response or fallback result
 */
export const withFallback = async (apiCall, fallback) => {
  try {
    return await apiCall();
  } catch (error) {
    console.warn('API call failed, using fallback:', error);
    return fallback();
  }
};