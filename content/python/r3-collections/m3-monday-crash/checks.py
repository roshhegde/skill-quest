from labcheck import check


@check("The script finishes without crashing")
def no_crash(ctx):
    ctx.require_no_error()


@check("Unknown items are reported")
def reports_missing(ctx):
    _, printed = ctx.call("daily_total", {"latte": 1, "tea": 2})
    assert "tea" in printed, "Items that aren't on the menu should be printed, but tea wasn't"


@check("Monday total is 47.50")
def monday_total(ctx):
    total, _ = ctx.call("daily_total", ctx.get("monday_orders"))
    assert abs(total - 47.5) < 1e-9, f"Monday total should be 47.50, got {total:.2f}"


@check("Works for any day's orders")
def any_orders(ctx):
    total, _ = ctx.call("daily_total", {"mocha": 2, "scone": 1})
    assert abs(total - 8.0) < 1e-9, f"2 mochas and an unknown scone should total 8.00, got {total:.2f}"
