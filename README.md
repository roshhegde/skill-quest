# Skill Quest

A hands-on, game-like way to learn Python, Terraform, AWS and Azure: short missions, labs that run in your browser, boss fights and exams instead of long lectures.

This is **phase 0** of the plan: the foundations that every later lab builds on.

- Python 3.14 (Pyodide) runs in a background Web Worker, so a stuck program never freezes the page.
- **Stop** kills a running program, and anything still running after 5 seconds is stopped automatically.
- A CodeMirror 6 editor with Python highlighting (Ctrl/Cmd+Enter runs the code).
- Two **spikes** you can run from the page to check that libraries later tracks need work in the browser:
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

The browser tests check that Python runs, errors show a clean traceback, and endless loops can be stopped.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

## Layout

```
src/
  runner/          Python worker and the PythonRunner that controls it
  components/      CodeEditor (CodeMirror) and the spike panel
  spikes/          The moto and python-hcl2 checks
tests/             Playwright browser tests
scripts/           Copies the Pyodide runtime into public/
```
