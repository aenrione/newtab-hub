window.Hub = window.Hub || {};

Hub.rawJsonEditor = (function () {
  var helpers = Hub.rawJsonEditorHelpers;
  var engine = Hub.rawJsonEditorEngine;
  var schema = Hub.rawJsonEditorSchema;

  return {
    formatConfigJSON: helpers.formatConfigJSON,
    parseConfigJSON: helpers.parseConfigJSON,
    rawFindInnerWordRange: helpers.rawFindInnerWordRange,
    rawMoveWordBackward: helpers.rawMoveWordBackward,
    rawMoveWordForward: helpers.rawMoveWordForward,
    rawMoveWordEnd: helpers.rawMoveWordEnd,
    rawMoveParagraphForward: helpers.rawMoveParagraphForward,
    rawMoveParagraphBackward: helpers.rawMoveParagraphBackward,
    rawFindMatchingBracket: helpers.rawFindMatchingBracket,
    rawDeleteCurrentLine: helpers.rawDeleteCurrentLine,
    rawPasteLine: helpers.rawPasteLine,
    validateSchema: schema.validate,
    collectSchemaHints: schema.collectHints,
    open: engine.open
  };
})();
