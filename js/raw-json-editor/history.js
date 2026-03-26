window.Hub = window.Hub || {};

Hub.rawJsonEditorHistory = (function () {
  function create(options) {
    var history = [];
    var historyIndex = -1;

    function push(force) {
      var snapshot = options.capture();
      var current = history[historyIndex];

      if (!force && current && current.text === snapshot.text) {
        current.caret = snapshot.caret;
        current.selectionStart = snapshot.selectionStart;
        current.selectionEnd = snapshot.selectionEnd;
        current.selectionDirection = snapshot.selectionDirection;
        current.folds = snapshot.folds;
        return;
      }

      history = history.slice(0, historyIndex + 1);
      history.push(snapshot);
      historyIndex = history.length - 1;
    }

    function restore(index, boundaryMessage) {
      if (index < 0 || index >= history.length) {
        if (options.onBoundary) options.onBoundary(boundaryMessage);
        return false;
      }

      historyIndex = index;
      options.apply(history[historyIndex]);
      return true;
    }

    return {
      push: push,
      mark: function () { return push(true); },
      undo: function () { return restore(historyIndex - 1, "Already at oldest change."); },
      redo: function () { return restore(historyIndex + 1, "Already at newest change."); }
    };
  }

  return { create: create };
})();
