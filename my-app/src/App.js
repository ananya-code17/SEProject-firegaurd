import { useEffect, useState } from 'react';
import './App.css';
import ResultsBarChart from './ResultsBarChart.js';
import useScrollSpy from './useScrollSpy.js';
import { predictEconomicLoss, predictFireSeverity } from './api.js';

function App() {
  const [currentSection, setCurrentSection] = useState('home');
  const [forecastData, setForecastData] = useState(null);
  const [forecastResults, setForecastResults] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const activeSection = useScrollSpy();

  useEffect(() => {
    const savedData = localStorage.getItem('fireGuardForecastData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setForecastData(parsed);
      const apiFeatures = prepareApiFeatures(parsed);
      fetchBackendResults(parsed, apiFeatures);
    }

    const syncHashToSection = () => {
      const hash = window.location.hash.substring(1);
      if (["home", "forecast", "results", "documentation"].includes(hash)) {
        setCurrentSection(hash);
      }
    };

    syncHashToSection();
    window.addEventListener('hashchange', syncHashToSection);
    return () => window.removeEventListener('hashchange', syncHashToSection);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleNavClick = (section) => {
    setCurrentSection(section);
    window.location.hash = section;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleForecastSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const inputData = collectForecastInputs();
      localStorage.setItem('fireGuardForecastData', JSON.stringify(inputData));
      const apiFeatures = prepareApiFeatures(inputData);
      setForecastData(inputData);

      await fetchBackendResults(inputData, apiFeatures);

      setToastMessage('Forecast generated successfully!');
      setTimeout(() => handleNavClick('results'), 1000);
    } catch (error) {
      console.error('Error generating forecast:', error);
      setErrorMessage('Failed to generate forecast. Please try again or check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackendResults = async (inputData, apiFeatures) => {
    try {
      const lossData = await predictEconomicLoss(apiFeatures);
      const fsiData = await predictFireSeverity(apiFeatures);

      if (lossData?.predicted_economic_loss_usd && fsiData?.predicted_fsi) {
        const apiResults = createResults(inputData, lossData, fsiData);
        setForecastResults(apiResults);
      } else {
        console.warn("Incomplete backend response. Using fallback.");
        setForecastResults(calculateForecastResults(inputData));
      }
    } catch (error) {
      console.error("Error fetching from backend:", error);
      setForecastResults(calculateForecastResults(inputData));
    }
  };

  const createResults = (inputData, lossResponse, fsiResponse) => {
    try {
      const totalLoss = Math.round(lossResponse.predicted_economic_loss_usd);
      const propertyDamage = Math.round(totalLoss * 0.6);
      const businessDisruption = Math.round(totalLoss * 0.2);
      const tourismLoss = Math.round(totalLoss * 0.15);
      const healthCosts = Math.round(totalLoss * 0.05);

      return {
        totalLoss,
        propertyDamage,
        businessDisruption,
        tourismLoss,
        healthCosts,
        predictedFSI: fsiResponse.predicted_fsi,
        recoveryStrategy: {
          text: fsiResponse.suggested_response,
          tags: getRecoveryTags(fsiResponse.predicted_fsi, inputData.fireRisk)
        },
        chartData: [
          { label: 'Property', value: propertyDamage, color: '#1e5631' },
          { label: 'Business', value: businessDisruption, color: '#1e88e5' },
          { label: 'Tourism', value: tourismLoss, color: '#ff6b35' },
          { label: 'Health', value: healthCosts, color: '#ffd166' }
        ]
      };
    } catch (error) {
      console.error("Error creating results from API:", error);
      return calculateForecastResults(inputData);
    }
  };


  const calculateForecastResults = (data) => {
    const baseLossData = {
      'California': { property: 300000, business: 100000, tourism: 75000, health: 25000 },
      'Oregon': { property: 150000, business: 50000, tourism: 30000, health: 20000 },
      'Washington': { property: 200000, business: 75000, tourism: 50000, health: 25000 },
      'Colorado': { property: 160000, business: 55000, tourism: 40000, health: 20000 },
      'Arizona': { property: 180000, business: 70000, tourism: 50000, health: 20000 },
      'Nevada': { property: 130000, business: 40000, tourism: 35000, health: 15000 },
      'Idaho': { property: 110000, business: 30000, tourism: 25000, health: 15000 },
      'Montana': { property: 120000, business: 35000, tourism: 30000, health: 15000 }
    };

    
    const riskMultiplier = { 'Low': 0.8, 'Medium': 1.5, 'High': 2.5, 'Extreme': 4.0 };
    const populationMultiplier = { 'Low': 0.8, 'Medium': 1.0, 'High': 1.3 };
    const strategyMap = {
      'Low': { text: 'Minimal intervention needed.', tags: ['Monitoring', 'Prevention'] },
      'Medium': { text: 'Targeted planning recommended.', tags: ['Preparedness', 'Planning'] },
      'High': { text: 'Comprehensive recovery required.', tags: ['Federal Support', 'Business Grants'] },
      'Extreme': { text: 'Urgent intervention required.', tags: ['Emergency Funds', 'Redevelopment'] }
    };

    const regionData = baseLossData[data.region] || baseLossData['California'];
    const riskMult = riskMultiplier[data.fireRisk] || 1.5;
    const popMult = populationMultiplier[data.populationDensity] || 1.0;
    const yearFactor = 1 + ((data.year - 2024) * 0.05);

    const pd = Math.round(regionData.property * riskMult * popMult * yearFactor);
    const bd = Math.round(regionData.business * riskMult * popMult * yearFactor);
    const tl = Math.round(regionData.tourism * riskMult * yearFactor);
    const hc = Math.round(regionData.health * riskMult * popMult * yearFactor);
    const total = pd + bd + tl + hc;

    const fsiMap = { 'Low': 3, 'Medium': 5, 'High': 7, 'Extreme': 9 };
    const fsi = fsiMap[data.fireRisk] || 5;

    return {
      totalLoss: total,
      propertyDamage: pd,
      businessDisruption: bd,
      tourismLoss: tl,
      healthCosts: hc,
      predictedFSI: fsi,
      recoveryStrategy: {
        text: strategyMap[data.fireRisk]?.text || "Standard monitoring and preparation recommended.",
        tags: strategyMap[data.fireRisk]?.tags || ["Monitoring", "Prevention", "Education"]
      },
      chartData: [
        { label: 'Property', value: pd, color: '#1e5631' },
        { label: 'Business', value: bd, color: '#1e88e5' },
        { label: 'Tourism', value: tl, color: '#ff6b35' },
        { label: 'Health', value: hc, color: '#ffd166' }
      ]
    };
  };

  const prepareApiFeatures = (inputData) => {
    return {
      Region: inputData.region,
      Year: inputData.year,
      FireRiskLevel: getRiskLevelNumeric(inputData.fireRisk),
      PopulationDensity: getPopulationDensityNumeric(inputData.populationDensity),
      VegetationDensity: 2,
      AverageTemperature: 25,
      PreviousFireHistory: 1,
      WindSpeed: 10,
      Humidity: 40
    };
  };

  const getRiskLevelNumeric = (riskLevel) => {
    const riskMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Extreme': 4 };
    return riskMap[riskLevel] || 1;
  };

  const getPopulationDensityNumeric = (density) => {
    const densityMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
    return densityMap[density] || 1;
  };

  const getRecoveryTags = (fsi, riskLevel) => {
    if (fsi >= 8 || riskLevel === 'Extreme') return ['Emergency Funds', 'Evacuation', 'Federal Support'];
    if (fsi >= 6 || riskLevel === 'High') return ['Federal Support', 'Business Grants', 'Community Resources'];
    if (fsi >= 4 || riskLevel === 'Medium') return ['Preparedness', 'Planning', 'Community Support'];
    return ['Monitoring', 'Prevention', 'Education'];
  };

  const collectForecastInputs = () => {
    const region = document.getElementById('region').value;
    const year = parseInt(document.getElementById('year').value);
    const fireRisk = document.getElementById('fire-risk').value;
    const populationDensity = document.getElementById('population-density').value;
    return { region, year, fireRisk, populationDensity };
  };


  return (
    <div id="app">
      <header className="header">
        <div className="container header-container">
          <div className="logo">
            <span className="logo-icon">🔥</span>
            <h1>FireGuard</h1>
          </div>
          <nav className="main-nav">
            <ul>
              <li><a href="#home" className={`nav-link ${currentSection === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick('home'); }}>Home</a></li>
              <li><a href="#forecast" className={`nav-link ${currentSection === 'forecast' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick('forecast'); }}>Create Forecast</a></li>
              <li><a href="#results" className={`nav-link ${currentSection === 'results' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick('results'); }}>Results</a></li>
              <li><a href="#documentation" className={`nav-link ${currentSection === 'documentation' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick('documentation'); }}>Documentation</a></li>
            </ul>
          </nav>
          <button className="mobile-menu-button" aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
    
      <main className="main-content">
        {/* HOME SECTION */}
        {currentSection === 'home' && (
        <section id="home" className={`section section-home ${currentSection === 'home' ? 'active' : ''}`}>
          <div className="container">
            <div className="hero">
              <div className="hero-content">
                <h2 className="animate-fade-in">Predict & Prepare for Wildfire Economic Impact</h2>
                <p className="animate-fade-in delay-1">FireGuard provides cutting-edge economic forecasting to help communities, businesses, and governments prepare for and mitigate the financial impacts of wildfires.</p>
                <div className="cta-buttons animate-fade-in delay-2">
                  <a href="#forecast" className="cta-button primary" data-nav="forecast" onClick={(e) => { e.preventDefault(); handleNavClick('forecast'); }}>Create New Forecast</a>
                  <a href="#documentation" className="cta-button secondary" data-nav="documentation" onClick={(e) => { e.preventDefault(); handleNavClick('documentation'); }}>Learn More</a>
                </div>
              </div>
              <div className="hero-image animate-fade-in delay-3">
                <img src="./image.jpg" alt="Wildfire landscape" />
              </div>
            </div>
            <div className="features">
              <h2 className="section-title animate-fade-in">Key Features</h2>
              <div className="features-grid">
                <div className="feature-card animate-fade-in delay-1">
                  <div className="feature-icon">📊</div>
                  <h3>Economic Forecasting</h3>
                  <p>Accurate predictions of economic losses based on multiple variables and advanced modeling.</p>
                </div>
                <div className="feature-card animate-fade-in delay-2">
                  <div className="feature-icon">🏙</div>
                  <h3>Regional Analysis</h3>
                  <p>Specific analysis for different states and regions with unique economic profiles.</p>
                </div>
                <div className="feature-card animate-fade-in delay-3">
                  <div className="feature-icon">⏱</div>
                  <h3>Future Projections</h3>
                  <p>Forecast economic impact for future years with climate change considerations.</p>
                </div>
                <div className="feature-card animate-fade-in delay-4">
                  <div className="feature-icon">🔄</div>
                  <h3>Recovery Planning</h3>
                  <p>Tailored recovery strategies based on forecast results to minimize economic damage.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* FORECAST SECTION */}
        {currentSection === 'forecast' && (
          <section id="forecast" className={`section section-forecast ${currentSection === 'forecast' ? 'active' : ''}`}>
            <div className="container">
              <h2 className="section-title">Create Economic Impact Forecast</h2>
              <p className="section-description">Fill in the parameters below to generate a customized wildfire economic impact forecast.</p>
              <form id="forecast-form" className="forecast-form" onSubmit={handleForecastSubmit}>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="region">Region</label>
                    <select id="region" name="region" required>
                      <option value="California">California</option>
                      <option value="Oregon">Oregon</option>
                      <option value="Washington">Washington</option>
                      <option value="Colorado">Colorado</option>
                      <option value="Arizona">Arizona</option>
                      <option value="Nevada">Nevada</option>
                      <option value="Idaho">Idaho</option>
                      <option value="Montana">Montana</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="year">Year</label>
                    <select id="year" name="year" required>
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="fire-risk">Fire Risk Level</label>
                    <select id="fire-risk" name="fire-risk" required>
                      {['Low', 'Medium', 'High', 'Extreme'].map((risk) => (
                        <option key={risk} value={risk}>{risk}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="population-density">Population Density</label>
                    <select id="population-density" name="population-density" required>
                      {['Low', 'Medium', 'High'].map((pop) => (
                        <option key={pop} value={pop}>{pop}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" id="forecast-btn" className="forecast-btn" disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Forecast'}
                </button>
              </form>
              
              {errorMessage && (
                <div className="error-message">
                  {errorMessage}
                </div>
              )}
            </div>
          </section>
        )}

        {/* RESULTS SECTION */}
        {currentSection === 'results' && (
          <section id="results" className={`section section-results ${currentSection === 'results' ? 'active' : ''}`}>
            <div className="container">
              <h2 className="section-title">Economic Impact Projection</h2>

              {/* Message if no results */}
              {!forecastResults && (
                <div className="no-results-message">
                  <p>No forecast data available. Please create a forecast first.</p>
                  <a
                    href="#forecast"
                    className="cta-button primary"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('forecast');
                    }}
                  >
                    Create New Forecast
                  </a>
                </div>
              )}

              {/* Results Content */}
              {forecastResults && (
                <div className="results-content">
                  <div className="meta-info">
                    <div className="meta-item">
                      <span className="meta-label">Region:</span>
                      <span className="meta-value">{forecastData.region}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Year:</span>
                      <span className="meta-value">{forecastData.year}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Risk Level:</span>
                      <span className="meta-value">{forecastData.fireRisk}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Fire Severity Index:</span>
                      <span className="meta-value">{forecastResults.predictedFSI}</span>
                    </div>
                  </div>

                  <div className="chart-container">
                    <ResultsBarChart forecastResults={forecastResults} />
                  </div>

                  <div className="result-summary">
                    <div className="result-section">
                      <h3>Estimated Total Economic Loss</h3>
                      <p id="total-loss">${forecastResults?.totalLoss?.toLocaleString() }</p>

                      <div className="impact-breakdown">
                        <div className="impact-item">
                          <h4>Property Damage</h4>
                          <span className="impact-value">${forecastResults?.propertyDamage?.toLocaleString()}</span>
                        </div>
                        <div className="impact-item">
                          <h4>Business Disruption</h4>
                          <span className="impact-value">${forecastResults?.businessDisruption?.toLocaleString() }</span>
                        </div>
                        <div className="impact-item">
                          <h4>Tourism Loss</h4>
                          <span className="impact-value">${forecastResults?.tourismLoss?.toLocaleString() }</span>
                        </div>
                        <div className="impact-item">
                          <h4>Health Costs</h4>
                          <span className="impact-value">${forecastResults?.healthCosts?.toLocaleString() }</span>
                        </div>
                      </div>
                    </div>

                    <div className="recovery-box">
  <h3 className="recovery-heading">Recommended Recovery Strategy</h3>
  <p className="recovery-text">
    {forecastResults.recoveryStrategy.text}
  </p>
  <div className="recovery-tags">
    {forecastResults.recoveryStrategy.tags.map((tag, index) => (
      <span key={index} className="recovery-tag">{tag}</span>
    ))}
  </div>
</div>

                    <div className="actions">
                      <button
                        className="action-button"
                        onClick={() => {
                          if (forecastData) {
                            localStorage.setItem('fireGuardForecastData', JSON.stringify(forecastData));
                            setToastMessage('Report saved successfully!');
                          }
                        }}
                      >
                        Save Report
                      </button>
                      <button className="action-button" onClick={() => window.print()}>
                        Print Report
                      </button>
                      <button
                        className="action-button primary"
                        onClick={() => handleNavClick('forecast')}
                      >
                        Create New Forecast
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
 {/* DOCUMENTATION SECTION */}

 {currentSection === 'documentation' && (
  <section id="documentation" className={`section section-documentation active`}>
    <div className="container">
      <div className="documentation">
        {/* Sidebar with ScrollSpy */}
        <div className="doc-sidebar">
          <ul className="doc-nav">
            <li className={activeSection === 'methodology' ? 'active' : ''}>
              <a href="#methodology" className="doc-nav-link">Methodology</a>
            </li>
            <li className={activeSection === 'parameters' ? 'active' : ''}>
              <a href="#parameters" className="doc-nav-link">Parameters</a>
            </li>
            <li className={activeSection === 'interpreting' ? 'active' : ''}>
              <a href="#interpreting" className="doc-nav-link">Interpreting Results</a>
            </li>
            <li className={activeSection === 'recovery' ? 'active' : ''}>
              <a href="#recovery" className="doc-nav-link">Recovery Strategies</a>
            </li>
            <li className={activeSection === 'faq' ? 'active' : ''}>
              <a href="#faq" className="doc-nav-link">FAQ</a>
            </li>
          </ul>
        </div>

        {/* Main Documentation Content */}
        <div className="doc-content">

          <section id="methodology">
            <h2>Forecasting Methodology</h2>
            <p>
              FireGuard's economic impact forecasting methodology combines historical wildfire data, economic indicators, and advanced predictive modeling to estimate the financial consequences of wildfires across different regions.
            </p>
            <h3>Core Approach</h3>
            <ul>
              <li>Historical economic impact data from past wildfires.</li>
              <li>Regional economic variables including GDP, industry composition, and population density</li>
              <li>Climate trend projections and their correlation with fire severity</li>
              <li>Infrastructure vulnerability assessments</li>
              <li>Tourism dependency metrics</li>
            </ul>
            <h3>Validation</h3>
            <p>
              The forecasting model has been validated against historical data with a mean accuracy rate of 67% when comparing predicting economic loss for wildfires.
            </p>
          </section>

          <section id="parameters">
            <h2>Parameter Definitions</h2>
            <p>Understanding the key parameters that influence the forecast is essential for accurate interpretation of results.</p>
            <h3>Core Parameters</h3>
            <ul>
              <li><strong>Region:</strong> Geographical area for which the forecast is being generated.</li>
              <li><strong>Year:</strong> Target year for the forecast. Future projections include trend analysis.</li>
              <li><strong>Fire Risk Level:</strong> Projected severity (Low, Medium, High, Extreme).</li>
              <li><strong>Population Density:</strong> Affects the scale of economic loss and recovery needs.</li>
            </ul>
          </section>

          <section id="interpreting">
            <h2>Interpreting Results</h2>
            <p>The forecast results provide a comprehensive overview of economic loss of wildfires across multiple regions.</p>
            <h3>Key Metrics</h3>
            <ul>
              <li><strong>Total Economic Loss:</strong> Aggregate financial impact across all categories.</li>
              <li><strong>Property Damage:</strong> Destruction of homes, businesses, infrastructure.</li>
              <li><strong>Business Disruption:</strong> Lost productivity and revenue due to wildfires.</li>
              <li><strong>Tourism Loss:</strong> Reduced economic activity from fewer visitors.</li>
              <li><strong>Health Costs:</strong> Expenses and productivity losses from smoke exposure and health issues.</li>
            </ul>
            
          </section>

          <section id="recovery">
            <h2>Recovery Strategies</h2>
            <p>Based on the forecast results, FireGuard recommends tailored recovery strategies to minimize economic damage and accelerate recovery.</p>
            <div className="strategy-box">
              <h3>Low Impact Strategies</h3>
              <p>Focus on preventive measures and community education.</p>
            </div>
            <div className="strategy-box">
              <h3>Medium Impact Strategies</h3>
              <p>Balance prevention with economic interventions and infrastructure investment.</p>
            </div>
            <div className="strategy-box">
              <h3>High Impact Strategies</h3>
              <p>Require federal assistance, recovery grants, and support services.</p>
            </div>
            <div className="strategy-box">
              <h3>Extreme Impact Strategies</h3>
              <p>Trigger emergency aid, relocation plans, and long-term redevelopment programs.</p>
            </div>
          </section>

          <section id="faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-item">
              <h3>Can I use these forecasts for insurance planning?</h3>
              <p>They're designed for planning, not insurance underwriting. Use as supplementary insights.</p>
            </div>
            <div className="faq-item">
              <h3>How often is the model updated?</h3>
              <p>Annually, using updated fire impact data, economic indicators, and climate trends.</p>
            </div>
            <div className="faq-item">
              <h3>Can I forecast for other regions?</h3>
              <p>Currently limited to listed regions. More areas will be added in future updates.</p>
            </div>
          </section>

          

        </div>
      </div>
    </div>
  </section>
)}


</main>
{/* FOOTER SECTION */}
<footer className="footer">
        <div className="container">
          <p>© 2025 FireGuard Technologies | Powered by Advanced Machine Learning</p>
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#documentation">Documentation</a>
            <a href="#">API</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
   



      

            {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast show">
          <div className="toast-content">
            <div className="toast-icon">✓</div>
            <div className="toast-message">{toastMessage}</div>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}
    </div>

  );
}

export default App;