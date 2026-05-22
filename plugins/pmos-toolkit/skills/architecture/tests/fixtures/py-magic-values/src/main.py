# Purpose: T6 fixture — magic value comparison; ruff must flag PLR2004 (PY007).
def check(x):
    if x == 42:
        return True
    return False
