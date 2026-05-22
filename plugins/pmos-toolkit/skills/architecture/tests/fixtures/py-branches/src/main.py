# Purpose: T6 fixture — too many branches (>12); ruff must flag PLR0912 (PY006).
def too_many_branches(x):
    if x is None:
        pass
    elif isinstance(x, bool):
        pass
    elif isinstance(x, int):
        pass
    elif isinstance(x, float):
        pass
    elif isinstance(x, str):
        pass
    elif isinstance(x, list):
        pass
    elif isinstance(x, tuple):
        pass
    elif isinstance(x, dict):
        pass
    elif isinstance(x, set):
        pass
    elif isinstance(x, frozenset):
        pass
    elif isinstance(x, bytes):
        pass
    elif isinstance(x, bytearray):
        pass
    elif callable(x):
        pass
    else:
        pass
