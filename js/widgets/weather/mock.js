(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["weather"] = {
  location: "New York"
};

/* Weather API data is covered by the global storybook-mocks.js:
   - geocoding-api.open-meteo.com  → { results: [{ name, latitude, longitude, country }] }
   - api.open-meteo.com/v1/forecast → { current, hourly, daily }
*/
