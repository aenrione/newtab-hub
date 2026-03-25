const fs = require("fs");
const path = require("path");

describe("main search autofocus wiring", function () {
  test("does not unconditionally focus search at init end", function () {
    const source = fs.readFileSync(path.join(__dirname, "..", "js/main.js"), "utf8");

    expect(source).not.toMatch(/\n\s*Hub\.focusSearch\(\);\s*\n\s*}\s*\n\s*init\(\)/);
  });
});
