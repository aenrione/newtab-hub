const fs = require("fs");
const path = require("path");

describe("widget test coverage", function () {
  test("every manifest widget has its own widget test file", function () {
    const root = path.join(__dirname, "..", "..");
    const manifestPath = path.join(root, "js", "widgets", "manifest.json");
    const widgetNames = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const missingTests = widgetNames.filter(function (widgetName) {
      const testPath = path.join(root, "tests", "widgets", widgetName, "index.test.js");
      return !fs.existsSync(testPath);
    });

    expect(missingTests).toEqual([]);
  });
});
