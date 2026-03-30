(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/ocs/v2.php/apps/serverinfo/api/v1/info",
    data: {
      ocs: {
        meta: { status: "ok", statuscode: 200 },
        data: {
          nextcloud: {
            system: {
              freespace:    214748364800,  /* ~200 GB */
              version:      "28.0.3"
            },
            storage: {
              num_users:    4,
              num_files:    82341,
              num_shares:   127
            }
          },
          activeUsers: {
            last5minutes: 2,
            last1hour:    3,
            last24hours:  4
          }
        }
      }
    }
  }
);
