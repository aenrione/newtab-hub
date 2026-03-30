(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["twitch-channels"] = {
  channels:    ["timthetatman", "shroud", "summit1g", "xQc", "pokimane"],
  showOffline: true
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "api.twitch.tv/helix/streams",
    data: {
      data: [
        { user_login: "timthetatman", user_name: "TimTheTatman", game_name: "Call of Duty: Warzone", viewer_count: 48200, type: "live" },
        { user_login: "shroud",       user_name: "shroud",       game_name: "Valorant",               viewer_count: 31700, type: "live" },
        { user_login: "xqc",          user_name: "xQc",          game_name: "Just Chatting",          viewer_count: 84300, type: "live" }
      ]
    }
  },
  {
    match: "api.twitch.tv/helix/users",
    data: {
      data: [
        { login: "timthetatman", display_name: "TimTheTatman", profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/timthetatman-profile_image-d7a4b8f28a0e6c47-300x300.png" },
        { login: "shroud",       display_name: "shroud",       profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/7ed5e0c6-0191-4eef-8328-4af6e4ea5318-profile_image-300x300.png" },
        { login: "summit1g",     display_name: "summit1g",     profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/summit1g-profile_image-9146718974ff7e10-300x300.png" },
        { login: "xqc",          display_name: "xQc",          profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/xqc-profile_image-9298dca608632101-300x300.png" },
        { login: "pokimane",     display_name: "pokimane",     profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/pokimane-profile_image-a9811601b37d3fdd-300x300.png" }
      ]
    }
  }
);
