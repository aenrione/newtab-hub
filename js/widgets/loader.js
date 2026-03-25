/* ── Widget loader ──
   To add a new widget: create js/widgets/<name>/index.js
   and add "<name>" to js/widgets/manifest.json.
   This file never needs to change.
── */

(function () {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "js/widgets/manifest.json", false /* synchronous */);
  xhr.send();
  var widgets = JSON.parse(xhr.responseText);
  widgets.forEach(function (name) {
    document.write('<script src="js/widgets/' + name + '/index.js"><\/script>');
  });
})();
