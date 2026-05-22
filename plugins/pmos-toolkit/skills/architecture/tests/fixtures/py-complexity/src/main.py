# Purpose: T6 fixture — cyclomatic complexity > 10; ruff must flag C901 (PY005).
def classify(x):
    result = None
    if x is None:
        result = "none"
    elif isinstance(x, bool):
        result = "bool"
    elif isinstance(x, int):
        result = "int"
    elif isinstance(x, float):
        result = "float"
    elif isinstance(x, str):
        result = "str"
    elif isinstance(x, list):
        result = "list"
    elif isinstance(x, tuple):
        result = "tuple"
    elif isinstance(x, dict):
        result = "dict"
    elif isinstance(x, set):
        result = "set"
    elif callable(x):
        result = "callable"
    elif hasattr(x, "__iter__"):
        result = "iterable"
    return result
