(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["iframe"] = {
  url:    "https://example.com",
  height: 300
};

/* iFrame renders the URL directly — no API mock needed.
   Note: most sites block embedding via X-Frame-Options; the widget
   will show a blank or blocked iframe, which is expected behaviour. */
