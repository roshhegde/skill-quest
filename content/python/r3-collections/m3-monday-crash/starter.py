menu = {"latte": 3.50, "mocha": 4.00, "bagel": 2.75, "muffin": 2.50}

monday_orders = {"latte": 6, "mocha": 4, "bagel": 2,
                 "muffin": 2, "pumpkin_spice": 3}

def daily_total(orders):
    total = 0
    missing = []
    for item, qty in orders.items():
        price = menu[item]
        total += price * qty
    print("Not on the menu:", missing)
    return total

print(f"Monday total: {daily_total(monday_orders):.2f}")
