(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/groups/statistics",
    data: {
      totalRecipes:    312,
      totalUsers:      3,
      totalCategories: 28,
      totalTags:       94
    }
  },
  {
    match: "/api/households/statistics",
    data: {
      totalRecipes:    312,
      totalUsers:      3,
      totalCategories: 28,
      totalTags:       94
    }
  }
);
