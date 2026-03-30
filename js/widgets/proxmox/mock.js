(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api2/json/cluster/resources",
    data: {
      data: [
        { type: "node", id: "node/pve1", status: "online",  maxcpu: 16, cpu: 0.18, maxmem: 68719476736,  mem: 28991029248  },
        { type: "node", id: "node/pve2", status: "online",  maxcpu: 8,  cpu: 0.07, maxmem: 34359738368,  mem: 9663676416   },
        { type: "node", id: "node/pve3", status: "offline", maxcpu: 8,  cpu: 0,    maxmem: 34359738368,  mem: 0            },
        { type: "qemu", id: "qemu/100", name: "ubuntu-dev",   status: "running", maxcpu: 4,  cpu: 0.12, maxmem: 8589934592,  mem: 5368709120,  template: 0 },
        { type: "qemu", id: "qemu/101", name: "windows-vm",   status: "running", maxcpu: 8,  cpu: 0.31, maxmem: 17179869184, mem: 14495514624, template: 0 },
        { type: "qemu", id: "qemu/102", name: "kali-pentest", status: "stopped", maxcpu: 2,  cpu: 0,    maxmem: 4294967296,  mem: 0,           template: 0 },
        { type: "qemu", id: "qemu/103", name: "docker-host",  status: "running", maxcpu: 4,  cpu: 0.22, maxmem: 8589934592,  mem: 6442450944,  template: 0 },
        { type: "lxc",  id: "lxc/200",  name: "pihole",       status: "running", maxcpu: 1,  cpu: 0.02, maxmem: 536870912,   mem: 184549376,   template: 0 },
        { type: "lxc",  id: "lxc/201",  name: "homebridge",   status: "running", maxcpu: 1,  cpu: 0.01, maxmem: 1073741824,  mem: 524288000,   template: 0 },
        { type: "lxc",  id: "lxc/202",  name: "zigbee2mqtt",  status: "running", maxcpu: 1,  cpu: 0.01, maxmem: 536870912,   mem: 209715200,   template: 0 }
      ]
    }
  }
);
