(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["group"] = {
  title: "Dev Feed",
  tabs: [
    { label: "HN",       type: "hacker-news", config: {} },
    { label: "Lobsters", type: "lobsters",     config: {} },
    { label: "Reddit",   type: "reddit",       config: { subreddit: "selfhosted" } }
  ]
};

/* Child widget data is provided by global storybook-mocks.js entries for
   hn.algolia.com, lobste.rs, and reddit.com */
