(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["home-assistant"] = {
  url:      "http://localhost:8123",
  entityId: "sensor.living_room_temperature"
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/states/",
    data: {
      entity_id: "sensor.living_room_temperature",
      state:     "21.4",
      attributes: {
        friendly_name:        "Living Room Temperature",
        unit_of_measurement:  "\u00b0C",
        device_class:         "temperature"
      },
      last_updated: "2026-03-26T14:32:00Z"
    }
  }
);
