from labcheck import check


@check('cafe_name is "Café Byte"')
def name(ctx):
    ctx.require_no_error()
    value = ctx.get("cafe_name")
    assert value != "", 'cafe_name is still an empty string. Put "Café Byte" between the quotes'
    assert value == "Café Byte", f'cafe_name is {value!r}, but it should be "Café Byte"'


@check("opening_hour is the whole number 8")
def hour(ctx):
    value = ctx.get("opening_hour")
    assert type(value) is int, f"opening_hour should be a whole number like 8, not {type(value).__name__}"
    assert value == 8, f"opening_hour is {value}, but the café opens at 8"


@check("The sign is printed exactly")
def sign(ctx):
    want = "Welcome to Café Byte! We open at 8."
    assert want in ctx.output.splitlines(), f"Expected this line in the output: {want}"


@check("The sign is built from your variables")
def uses_variables(ctx):
    printed = [line for line in ctx.code.splitlines() if "print(" in line]
    assert any("cafe_name" in line and "opening_hour" in line for line in printed), (
        "Use cafe_name and opening_hour inside print(), so the sign updates when they change"
    )
