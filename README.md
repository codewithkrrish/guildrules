# guildrules

A Discord server rules generator that lives in a single HTML file. Pick the rules
your server actually needs, choose a tone, and get a finished rules page —
previewed the way it will look in Discord, ready to copy or download as Markdown.

No build step, no dependencies, no server. Double-click `guildrules.html` and it runs.

## Try it

Open `guildrules.html` in any browser. That's the whole install.

1. Type your server name.
2. Pick a tone — Strict, Friendly, or Chill.
3. Tick the rule categories that apply, or hit a preset (Gaming server, Community,
   Study group) for a sensible starting set.
4. Add any custom rules of your own — they land at the end of the list.
5. Copy the Markdown, copy plain text, or download a `.md` file and paste it into
   your `#rules` channel.

## What it looks like

Server name: **The Forge** · Tone: Friendly · Preset: Gaming server

```markdown
# The Forge — Server Rules

Welcome to The Forge! These rules keep the server fun for everyone.
Please read them before chatting.

1. **Be respectful** — Be kind to each other. No harassment, insults, or hate
   speech — if you would not say it to someone's face, do not say it here.
2. **Be respectful** — Disagreements happen — keep them civil, stick to the
   topic, and let it go when a mod steps in.
3. **No spam** — Please do not flood the chat — no repeated messages, huge
   caps-lock walls, or copy-paste spam.
...
```

The preview pane on the right shows the same rules as a Discord message, so you
can see exactly what your members will see before you paste anything.

## Why I made this

I have set up enough Discord servers to know the worst part is not moderating —
it is writing the rules channel. Everyone copies the same wall of text from some
random server, half of it does not apply, and it reads like a legal document
nobody will finish. I wanted the opposite: tick what applies, pick how strict
you want to sound, and get rules that fit your server in about a minute.

The tone switch is the part I care about most. The rules do not change between
tones — only the voice does. A gaming server with friends and a 5,000-member
community should not sound the same, even when the rule is the same.

## What's inside

Everything lives in `guildrules.html`:

- `RuleGen` — the core. Holds the rule catalogue (8 categories, 11 rules, each
  worded three ways), builds the Markdown / plain-text / preview output, and
  validates its options with readable errors. It touches no DOM, so it runs
  identically in a browser or in Node — that is how the tests exercise it.
- the renderer — wires the controls to the core, renders the Discord-style
  preview, and handles copy/download (clipboard API with a textarea fallback,
  Blob download).

Rules are grouped by category in the output, numbered per your chosen style
(`1. 2. 3.`, `Rule 1:`, or dash bullets). Custom rules are appended in the order
you add them, and Markdown special characters in them are escaped so a `*`
in your text cannot accidentally bold half the page.

## Tests

```sh
node tests/run.js
```

15 checks, no dependencies: the harness extracts the `RuleGen` script from the
HTML, runs it in Node, and asserts the generator behaves — tone changes wording,
unchecking a category removes its rules, custom rules append in order and get
escaped, empty selections show a friendly empty state instead of crashing, bad
input throws readable errors, and every preset only references real categories.
The renderer script is compile-checked too.

## Limitations

- This generates the text of your rules, it does not post them — you still have
  to paste them into your server. (Posting for you would need a bot token, and
  I did not want this tool to ask for one.)
- The preview is a mock Discord message, not the real client. Real Discord
  renders the Markdown the same way, but font sizes and spacing will differ
  slightly.
- 11 built-in rules across 8 categories. If your server needs something unusual,
  that is what the custom rules box is for.
- English only. The rules are written in plain English and the generator does
  not translate them.

## Project structure

```
guildrules/
├── guildrules.html   # the whole app — core + UI + styles
├── tests/
│   └── run.js        # headless Node tests for the core (no deps)
├── README.md
├── LICENSE
└── .gitignore
```

## License

MIT — see [LICENSE](LICENSE).

## Author

Krrish — [github.com/codewithkrrish](https://github.com/codewithkrrish)
