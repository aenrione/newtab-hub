/* ── Keyboard navigation ── */

window.Hub = window.Hub || {};

Hub.keyboard = (function () {
  var focusIndex = -1;

  function focusables() {
    return Array.from(document.querySelectorAll('[data-focusable="true"]')).filter(function (n) { return n.offsetParent !== null; });
  }

  function rectCenter(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function overlap1d(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }

  function score(cur, rect, dir) {
    var cc = rectCenter(cur), tc = rectCenter(rect);
    var ox = overlap1d(cur.left, cur.right, rect.left, rect.right);
    var oy = overlap1d(cur.top, cur.bottom, rect.top, rect.bottom);

    if (dir === "right") {
      if (tc.x <= cc.x + 4) return null;
      return (oy > 0 ? 0 : 10000) + Math.max(0, rect.left - cur.right) * 12 + Math.abs(tc.y - cc.y);
    }
    if (dir === "left") {
      if (tc.x >= cc.x - 4) return null;
      return (oy > 0 ? 0 : 10000) + Math.max(0, cur.left - rect.right) * 12 + Math.abs(tc.y - cc.y);
    }
    if (dir === "down") {
      if (tc.y <= cc.y + 4) return null;
      return (ox > 0 ? 0 : 10000) + Math.max(0, rect.top - cur.bottom) * 12 + Math.abs(tc.x - cc.x);
    }
    if (dir === "up") {
      if (tc.y >= cc.y - 4) return null;
      return (ox > 0 ? 0 : 10000) + Math.max(0, cur.top - rect.bottom) * 12 + Math.abs(tc.x - cc.x);
    }
    return null;
  }

  function highlight(index) {
    var nodes = focusables();
    nodes.forEach(function (n) { n.classList.remove("focus-ring"); });
    if (index < 0 || index >= nodes.length) { focusIndex = -1; return; }
    focusIndex = index;
    nodes[index].classList.add("focus-ring");
    nodes[index].focus({ preventScroll: true });
    nodes[index].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function navigate(direction) {
    var nodes = focusables();
    if (!nodes.length) return;
    if (focusIndex === -1) { highlight(0); return; }
    var cur = nodes[focusIndex].getBoundingClientRect();
    var best = null;
    nodes.forEach(function (node, i) {
      if (i === focusIndex) return;
      var s = score(cur, node.getBoundingClientRect(), direction);
      if (s != null && (!best || s < best.score)) best = { index: i, score: s };
    });
    if (best) highlight(best.index);
  }

  var DIR_MAP = {
    arrowright: "right", l: "right",
    arrowleft: "left", h: "left",
    arrowdown: "down", j: "down",
    arrowup: "up", k: "up"
  };

  function bind(getState) {
    document.addEventListener("keydown", function (e) {
      var key = e.key.toLowerCase();
      var tag = document.activeElement?.tagName;
      var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (document.querySelector(".customize-dialog[open]")) return;
      if (document.querySelector(".help-dialog[open]")) {
        if (key === "escape") document.querySelector(".help-dialog[open]").close();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "l") return;
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        Hub.focusSearch();
        return;
      }

      if (!typing && key === "/") { e.preventDefault(); Hub.focusSearch(); return; }

      if (!typing && key === "?") { e.preventDefault(); Hub.help.show(); return; }
      if (!typing && key === "z") { e.preventDefault(); Hub.zen.toggle(); Hub.zen.updateButtonIcon(); return; }

      if (!typing && /^[1-9]$/.test(e.key)) {
        var st = getState();
        var item = st.pinned[Number(e.key) - 1];
        if (item) { e.preventDefault(); Hub.openItem(item.href, e.metaKey || e.ctrlKey); }
        return;
      }

      if (typing) return;

      if (DIR_MAP[key]) { e.preventDefault(); navigate(DIR_MAP[key]); return; }
      if (key === "d") { e.preventDefault(); window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: "smooth" }); return; }
      if (key === "u") { e.preventDefault(); window.scrollBy({ top: -Math.round(window.innerHeight * 0.6), behavior: "smooth" }); return; }
      if (key === "enter") {
        var nodes = focusables();
        var active = nodes[focusIndex];
        if (active && active.href) { e.preventDefault(); Hub.openItem(active.href, e.metaKey || e.ctrlKey); }
      }
    });
  }

  return { bind: bind, highlight: highlight, navigate: navigate, getFocusIndex: function () { return focusIndex; } };
})();
