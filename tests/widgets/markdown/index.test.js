const {
  FakeElement,
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals,
  createWidgetState
} = require("../helpers/widget-test-utils");

registerWidgetSmokeSuite({ widgetDir: "markdown" });

describe("markdownToHtml — checkboxes", function () {
  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/widgets/markdown/index.js");
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("- [ ] renders an unchecked checkbox (space inside brackets)", function () {
    const html = global.markdownToHtml("- [ ] Task one");
    expect(html).toContain('class="markdown-task"');
    expect(html).toContain('<input type="checkbox"');
    expect(html).not.toContain("checked");
    expect(html).toContain("Task one");
  });

  test("- [] renders an unchecked checkbox (empty brackets)", function () {
    const html = global.markdownToHtml("- [] Task two");
    expect(html).toContain('class="markdown-task"');
    expect(html).toContain('<input type="checkbox"');
    expect(html).not.toContain("checked");
    expect(html).toContain("Task two");
  });

  test("- [x] renders a checked checkbox", function () {
    const html = global.markdownToHtml("- [x] Done task");
    expect(html).toContain("checked");
    expect(html).toContain("markdown-task--done");
    expect(html).toContain("Done task");
  });

  test("- [X] (uppercase) renders a checked checkbox", function () {
    const html = global.markdownToHtml("- [X] Done uppercase");
    expect(html).toContain("checked");
    expect(html).toContain("markdown-task--done");
  });

  test("- [ ] **bold** renders inline markdown inside checkbox label", function () {
    const html = global.markdownToHtml("- [ ] **bold text**");
    expect(html).toContain("<strong>bold text</strong>");
    expect(html).toContain('class="markdown-task"');
    expect(html).not.toContain("checked");
  });

  test("- [x] *italic* renders inline markdown inside checked label", function () {
    const html = global.markdownToHtml("- [x] *italic text*");
    expect(html).toContain("<em>italic text</em>");
    expect(html).toContain("markdown-task--done");
  });

  test("- [ ] **bold** with no trailing space after ] still matches", function () {
    const html = global.markdownToHtml("- []**no space**");
    expect(html).toContain('class="markdown-task"');
    expect(html).toContain("<strong>no space</strong>");
  });

  test("regular list items are not turned into checkboxes", function () {
    const html = global.markdownToHtml("- regular item");
    expect(html).not.toContain("markdown-task");
    expect(html).not.toContain('<input type="checkbox"');
    expect(html).toContain("<li>regular item</li>");
  });

  test("mixed list renders both checkboxes and plain items", function () {
    const html = global.markdownToHtml("- [ ] check item\n- plain item\n- [x] done item");
    expect(html).toContain('class="markdown-task"');
    expect(html).toContain("check item");
    expect(html).toContain("<li>plain item</li>");
    expect(html).toContain("markdown-task--done");
    expect(html).toContain("done item");
  });
});

describe("markdownToHtml — inline formatting", function () {
  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/widgets/markdown/index.js");
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("**text** renders bold", function () {
    const html = global.markdownToHtml("**bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("*text* renders italic", function () {
    const html = global.markdownToHtml("*italic*");
    expect(html).toContain("<em>italic</em>");
  });

  test("~~text~~ renders strikethrough", function () {
    const html = global.markdownToHtml("~~strike~~");
    expect(html).toContain("<s>strike</s>");
  });
});
