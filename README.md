# Skill Quest

A hands-on, game-like way to learn Python, Terraform, AWS and Azure: short missions, labs that run in your browser, boss fights and exams instead of long lectures.

## How a mission works

Each mission teaches one idea and then makes you use it:

1. **Story**: a short scene from the track's world (for Python, the café "Café Byte") and a clear goal.
2. **Concept**: a small card with the idea and an example you can run with **Try it**.
3. **Lab**: starter code in a real editor. **Run checks** runs your code, then hidden checks say what works and what still needs fixing, in plain words.
4. **Hints**: up to three, unlocked one at a time. Each costs 2 XP.
5. **Reward**: XP (10 base, +5 with no hints, +5 on the first try, −2 per hint), a one-line recap, and the next mission.

Missions open in a fixed order. Progress is saved in your browser (IndexedDB), so there is no account.

## Engine

- Python 3.14 (Pyodide) runs in a background Web Worker, so a stuck program never freezes the page.
- **Stop** kills a running program, and anything still running after 5 seconds is stopped automatically.
- A CodeMirror 6 editor with Python highlighting (Ctrl/Cmd+Enter runs the code).
- A free playground at `#/playground`, with two **spikes** you can run from the page to check that libraries later tracks need work in the browser:
  - `moto` + `boto3` for AWS code labs
  - `python-hcl2` for Terraform labs

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` and `npm run build` copy the Pyodide runtime from `node_modules` into `public/pyodide`, so the core interpreter is served by this site. Extra packages (micropip, moto, ...) download from the Pyodide CDN when first used.

## Tests

```bash
npx playwright install chromium   # once
npm run test:e2e
```

The browser tests check that Python runs, errors show a clean traceback, and endless loops can be stopped. For every mission they also check that the starter code fails its checks and `solution.py` passes them all.

## Writing a mission

Add a folder under `content/<track>/<region>/<mission>/` with:

| File | What it holds |
| --- | --- |
| `mission.yaml` | id, region, order, title, format, minutes, xp, story, goal, concept (title, body, snippet), hints, recap |
| `starter.py` | The code the learner starts from |
| `checks.py` | Hidden checks, each a function decorated with `@check("what it checks")` that receives a `ctx` |
| `solution.py` | A working answer. Used only by tests and never shipped to the site |

In a check, `ctx.require_no_error()` fails if the code crashed, `ctx.get("name")` reads a variable, `ctx.call("fn", *args)` calls a function and returns `(result, printed_text)`, and `ctx.output` holds everything printed. A failing `assert` message is shown to the learner, so write it as advice. See `src/runner/labcheck.py`.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

## Layout

```
content/           Missions (story, concept, starter, checks, solution)
src/
  screens/         Home (mission path), Lab, Playground
  content/         Loads the missions at build time
  progress.ts      XP, levels and saved progress (Dexie / IndexedDB)
  runner/          Python worker, PythonRunner, and labcheck.py (the check harness)
  components/      CodeEditor (CodeMirror) and the spike panel
  spikes/          The moto and python-hcl2 checks
tests/             Playwright browser tests
scripts/           Copies the Pyodide runtime into public/
```
