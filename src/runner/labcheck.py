"""Check harness for labs.

A mission's checks.py registers checks with @check. After the learner's code
runs, run_checks() calls each one with a Ctx describing what happened. A check
passes unless it raises; the AssertionError message is shown to the learner.
"""

import contextlib
import io
import json

_checks = []


def check(name):
    def register(fn):
        _checks.append((name, fn))
        return fn

    return register


class Ctx:
    def __init__(self, code, ns, output, error):
        self.code = code  # the learner's source
        self.ns = ns  # names the learner's code defined
        self.output = output  # everything it printed
        self.error = error  # traceback text, or None

    def require_no_error(self):
        if self.error:
            last = self.error.strip().splitlines()[-1]
            raise AssertionError(f"Your code crashed: {last}")

    def get(self, name):
        if name not in self.ns:
            raise AssertionError(f"Couldn't find `{name}` in your code")
        return self.ns[name]

    def call(self, name, *args, **kwargs):
        """Call a function the learner wrote; returns (result, printed text)."""
        fn = self.get(name)
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                result = fn(*args, **kwargs)
        except Exception as e:
            raise AssertionError(f"{name}() raised {type(e).__name__}: {e}") from None
        return result, buf.getvalue()


def run_checks(checks_src, code, ns, output, error):
    _checks.clear()
    exec(compile(checks_src, "checks.py", "exec"), {"__name__": "checks"})
    ctx = Ctx(code, ns, output, error)
    results = []
    for name, fn in _checks:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                fn(ctx)
            results.append({"name": name, "passed": True, "message": "Passed"})
        except AssertionError as e:
            results.append({"name": name, "passed": False, "message": str(e) or "Not yet"})
        except Exception as e:
            results.append({"name": name, "passed": False, "message": f"{type(e).__name__}: {e}"})
    return json.dumps(results)
