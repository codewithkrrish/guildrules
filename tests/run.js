#!/usr/bin/env node
"use strict";
/* Headless tests for RuleGen (the rules core inside guildrules.html).
   The app is one HTML file by design, so this harness extracts the
   <script id="rulecore"> block, runs it in a vm sandbox, and asserts the
   generator behaves. The renderer script is compile-checked too. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const htmlPath = path.join(__dirname, "..", "guildrules.html");
const html = fs.readFileSync(htmlPath, "utf8");

function extract(id) {
  const m = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`));
  assert.ok(m, `script block #${id} not found`);
  return m[1];
}

const coreSrc = extract("rulecore");

// 1. the renderer script must at least parse (it needs a DOM to run)
const renderMatch = html.match(/<script>\n"use strict";\n\/\* renderer[\s\S]*?<\/script>/);
assert.ok(renderMatch, "renderer script block not found");
new vm.Script(renderMatch[0].replace(/^<script>/, "").replace(/<\/script>$/, ""),
  { filename: "renderer.js" });
console.log("ok  - renderer script parses");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(coreSrc, sandbox, { filename: "rulecore.js" });
const R = sandbox.RuleGen;
assert.ok(R && typeof R.buildRules === "function", "RuleGen.buildRules exported");
console.log("ok  - rulecore loads and exports its API");

function baseOpts(overrides) {
  return Object.assign({
    serverName: "Test Server",
    tone: "strict",
    selected: ["respect", "spam"],
    custom: [],
    numbering: "numbers",
    header: true,
    footer: true
  }, overrides || {});
}

// 2. default build: header names the server, rules come from the picked cats
{
  const out = R.buildRules(baseOpts());
  assert.ok(out.markdown.startsWith("# Test Server — Server Rules"));
  assert.ok(out.markdown.includes("Welcome to Test Server!"));
  assert.ok(out.markdown.includes("**Be respectful**"));
  assert.ok(out.markdown.includes("**No spam**"));
  assert.strictEqual(out.ruleCount, 4, "respect(2) + spam(2) = 4 rules");
  assert.ok(out.wordCount > 50, "word count is sane");
  assert.strictEqual(out.preview.length, 4);
  assert.strictEqual(out.preview[0].num, 1);
  assert.strictEqual(out.preview[0].title, "Be respectful");
  console.log("ok  - default build names the server and pulls the picked categories");
}

// 3. tone actually changes the wording
{
  const strict = R.buildRules(baseOpts({ tone: "strict" }));
  const friendly = R.buildRules(baseOpts({ tone: "friendly" }));
  const chill = R.buildRules(baseOpts({ tone: "chill" }));
  assert.notStrictEqual(strict.markdown, friendly.markdown);
  assert.notStrictEqual(friendly.markdown, chill.markdown);
  assert.ok(strict.markdown.includes("not tolerated"));
  assert.ok(friendly.markdown.includes("Be kind to each other"));
  assert.ok(chill.markdown.includes("Do not be a jerk"));
  console.log("ok  - strict / friendly / chill produce different wording");
}

// 4. unchecking a category removes its rules entirely
{
  const out = R.buildRules(baseOpts({ selected: ["age"] }));
  assert.strictEqual(out.ruleCount, 1);
  assert.ok(out.markdown.includes("13 or older"));
  assert.ok(!out.markdown.includes("Be respectful"));
  console.log("ok  - unchecking a category removes its rules");
}

// 5. custom rules land at the end, in order, and Markdown is escaped
{
  const out = R.buildRules(baseOpts({
    selected: [],
    custom: ["No spoilers *ever* until Monday", "Second custom rule"]
  }));
  assert.strictEqual(out.ruleCount, 2);
  assert.ok(out.markdown.includes("No spoilers \\*ever\\* until Monday"),
    "markdown special chars in custom text are escaped");
  assert.ok(out.markdown.indexOf("No spoilers") < out.markdown.indexOf("Second custom rule"),
    "custom rules keep insertion order");
  assert.ok(out.preview[0].title === "Custom rule");
  assert.ok(!R.escapeMarkdown("ends with a full stop. and a-hyphen").includes("\\"),
    "periods and hyphens are left alone — no backslash litter");
  console.log("ok  - custom rules append in order with Markdown escaped");
}

// 6. empty selection is a friendly empty state, not a crash
{
  const out = R.buildRules(baseOpts({ selected: [], custom: [] }));
  assert.strictEqual(out.ruleCount, 0);
  assert.strictEqual(out.preview.length, 0);
  assert.ok(out.markdown.includes("No rules selected yet"));
  assert.ok(out.plain.includes("No rules selected yet"));
  console.log("ok  - empty selection returns an empty state, not an error");
}

// 7. numbering styles change the prefixes in both formats
{
  const nums = R.buildRules(baseOpts({ numbering: "numbers" }));
  const labelled = R.buildRules(baseOpts({ numbering: "rule" }));
  const dashed = R.buildRules(baseOpts({ numbering: "dash" }));
  assert.ok(nums.markdown.includes("1. **Be respectful**"));
  assert.ok(labelled.markdown.includes("Rule 1: **Be respectful**"));
  assert.ok(dashed.markdown.includes("- **Be respectful**"));
  assert.ok(nums.plain.includes("1. Be respectful"));
  assert.ok(labelled.plain.includes("Rule 2:"));
  console.log("ok  - numbering styles apply to Markdown and plain text");
}

// 8. header/footer toggles drop those lines
{
  const out = R.buildRules(baseOpts({ header: false, footer: false }));
  assert.ok(!out.markdown.includes("Welcome to Test Server"));
  assert.ok(!out.markdown.includes("Thanks for being part of"));
  assert.strictEqual(out.header, "");
  assert.strictEqual(out.footer, "");
  console.log("ok  - header and footer toggles remove those lines");
}

// 9. blank server name falls back to the default, and is trimmed
{
  const out = R.buildRules(baseOpts({ serverName: "   " }));
  assert.strictEqual(out.serverName, "My Server");
  assert.ok(out.markdown.startsWith("# My Server — Server Rules"));
  const trimmed = R.buildRules(baseOpts({ serverName: "  Cool  Cats  " }));
  assert.strictEqual(trimmed.serverName, "Cool Cats");
  console.log("ok  - blank server name falls back to default; whitespace is trimmed");
}

// 10. bad input throws a readable error instead of producing garbage
{
  assert.throws(() => R.buildRules(baseOpts({ tone: "angry" })), /Unknown tone/);
  assert.throws(() => R.buildRules(baseOpts({ selected: ["nope"] })), /Unknown category/);
  assert.throws(() => R.buildRules(baseOpts({ numbering: "roman" })), /Unknown numbering/);
  assert.throws(() => R.buildRules(null), /options object/);
  console.log("ok  - unknown tone, category, and numbering throw readable errors");
}

// 11. presets reference real categories only
{
  Object.keys(R.PRESETS).forEach((name) => {
    R.PRESETS[name].forEach((id) => {
      assert.ok(R.CATEGORIES.some((c) => c.id === id),
        `preset ${name} references unknown category ${id}`);
    });
  });
  assert.ok(R.PRESETS.gaming.includes("voice"), "gaming preset includes voice rules");
  assert.ok(!R.PRESETS.study.includes("voice"), "study preset skips voice rules");
  console.log("ok  - every preset only references real categories");
}

// 12. every rule has wording for every tone, and no tone text is empty
{
  R.CATEGORIES.forEach((cat) => {
    cat.rules.forEach((rule) => {
      R.TONES.forEach((tone) => {
        assert.ok(typeof rule[tone] === "string" && rule[tone].length > 20,
          `${cat.id} rule is missing usable ${tone} wording`);
        assert.ok(!rule[tone].includes("TODO"), "no placeholder text left in rules");
      });
    });
  });
  console.log("ok  - every rule has real wording in all three tones");
}

// 13. plain text has no Markdown syntax in it
{
  const out = R.buildRules(baseOpts());
  assert.ok(!out.plain.includes("**"), "plain text must not contain bold markers");
  assert.ok(!out.plain.startsWith("#"), "plain text must not contain headings");
  console.log("ok  - plain text output is free of Markdown syntax");
}

// 14. blank custom rules are dropped, not rendered as empty lines
{
  const out = R.buildRules(baseOpts({
    selected: [],
    custom: ["", "   ", "Real rule"]
  }));
  assert.strictEqual(out.ruleCount, 1);
  assert.ok(out.markdown.includes("Real rule"));
  console.log("ok  - blank custom rules are dropped");
}

// 15. too many custom rules is refused up front
{
  const many = Array.from({ length: R.MAX_CUSTOM_RULES + 1 }, (_, i) => "rule " + i);
  assert.throws(() => R.buildRules(baseOpts({ custom: many })), /Too many custom rules/);
  console.log("ok  - custom rule cap is enforced");
}

console.log("\nall guildrules tests passed");
