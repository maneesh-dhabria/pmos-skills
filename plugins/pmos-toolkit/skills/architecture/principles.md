# Architecture Principles — Prose Layer

This document is the **judge-readable prose layer** companion to `principles.yaml`. The YAML is the machine-readable source of truth (rule IDs, dispositions, static-tool delegates, regex/AST checks); this file explains the *why*, shows concrete violations and compliant alternatives, and names the static tool each rule delegates to.

Every rule ID in `principles.yaml` has a matching `## <id>` heading below. The pairing is enforced by `tests/test-principles-md-coverage.sh` (run on every commit via the drift hook).

Conventions per rule:
- **Summary** — one-sentence restatement of the rule's intent.
- **Why** — architectural rationale, with concrete consequences of violation.
- **Example violation** — a small snippet showing the rule broken.
- **Example compliance** — the same snippet refactored to satisfy the rule.
- **Static tools** — the YAML's `delegate_to` value verbatim; `judge-only` means no automated tool, so the LLM judge applies it directly.

---

## U001

**Summary:** No source file exceeds 500 lines of code (excluding generated files).

**Why:** A file past ~500 LOC is a cognitive cliff — readers can no longer hold the whole module in working memory, so they pattern-match on neighbouring lines instead of reasoning about the design. Long files tend to accrete unrelated responsibilities (helpers, types, side-effects, glue) because adding "one more thing" is always cheaper than introducing a new file. Splitting forces an explicit naming decision that surfaces the latent module boundary.

**Example violation:**
```
src/orders/checkout.ts   (842 lines: pricing + tax + payment + email + audit log)
```

**Example compliance:**
```
src/orders/checkout.ts            (180 lines — orchestrator)
src/orders/pricing.ts             (120 lines)
src/orders/tax.ts                 (90 lines)
src/orders/payment.ts             (140 lines)
src/orders/notifications.ts       (95 lines)
```

**Static tools:** `grep`

---

## U002

**Summary:** No single function exceeds 100 lines.

**Why:** A 100-line function almost always does more than one thing — it has implicit phases (validate, transform, persist, notify) that should be named, extracted, and unit-tested individually. Long functions hide branches deep in the body where they are easy to miss during review. They also defeat code-completion and stack-trace navigation: the line number alone tells you nothing.

**Example violation:**
```python
def process_order(order):  # 140 lines
    # validate...
    # compute pricing...
    # charge card...
    # send confirmation...
    # write audit log...
```

**Example compliance:**
```python
def process_order(order):
    validate(order)
    priced = price(order)
    charge(priced)
    notify(priced)
    audit(priced)
```

**Static tools:** `grep`

---

## U003

**Summary:** No constructor or function takes more than 4 positional arguments.

**Why:** Long positional lists are call-site bugs waiting to happen — readers cannot tell `f(true, false, null, 0, "x")` from `f(false, true, null, 0, "x")` without jumping to the definition. They also make adding a new parameter a breaking change because every call site shifts. An options object (or named keyword arguments) makes intent self-documenting and additive.

**Example violation:**
```typescript
function createUser(name, email, age, role, isAdmin, region, locale) { ... }
createUser("A", "a@x", 30, "u", false, "us", "en");
```

**Example compliance:**
```typescript
function createUser(opts: { name: string; email: string; age: number; role: Role; isAdmin?: boolean; region?: string; locale?: string }) { ... }
createUser({ name: "A", email: "a@x", age: 30, role: "u" });
```

**Static tools:** `grep`

---

## U004

**Summary:** No `console.log` / `print()` statements in production source paths (`src/`); allowed in `scripts/` and `tests/`.

**Why:** Stray debug prints leak into production logs as noise, masking the signal when something actually breaks. They also signal abandoned debugging sessions — a developer was poking at the code, learned what they needed, and forgot to clean up. Real diagnostics belong behind a structured logger with a level and a category.

**Example violation:**
```typescript
// src/auth/login.ts
export function login(user) {
  console.log("DEBUG user=", user);  // ← leaks PII to prod logs
  return signToken(user);
}
```

**Example compliance:**
```typescript
import { logger } from "../infra/logger";
export function login(user) {
  logger.debug({ userId: user.id }, "login attempt");
  return signToken(user);
}
```

**Static tools:** `grep`

---

## U005

**Summary:** No `TODO` / `FIXME` / `XXX` comments older than 90 days (per `git blame`).

**Why:** A TODO older than a quarter is no longer a reminder — it is a decision the team has made implicitly to not do the thing. Leaving it inline creates ambient noise that trains everyone to ignore TODOs, including the urgent ones. Either file it as a tracked issue or delete it; the comment itself has zero accountability.

**Example violation:**
```python
# TODO: handle timezone properly  (added 2024-01-03, today is 2026-05-28)
return datetime.now()
```

**Example compliance:**
```python
# Tracked in issue #482 (target: Q3 2026)
return datetime.now()
```

Or just delete the comment and live with the current behaviour.

**Static tools:** `grep`

---

## U006

**Summary:** No file path is more than 4 directory levels deep from `src/`.

**Why:** Deep nesting (`src/a/b/c/d/e/f.ts`) is almost always evidence of scope creep — each new level was added to "organise" code that should have been promoted to a sibling module instead. Deeply nested paths also break editor fuzzy-search and make imports long and brittle. Flat-is-better-than-nested forces the team to name boundaries explicitly.

**Example violation:**
```
src/features/billing/invoices/templates/pdf/footer.ts
```

**Example compliance:**
```
src/billing/invoice-pdf.ts
```

**Static tools:** `grep`

---

## U007

**Summary:** Every source file should carry a top-of-file purpose comment (warn-only — disposition is `wont_fix`).

**Why:** A single-line header (`// Renders the cart sidebar; owns the line-item totals.`) gives a cold reader the file's job in 5 seconds — without it they have to scroll-and-infer from the first export. This rule is warn-only because not every file genuinely needs one (one-line barrel re-exports, generated code), but the general posture is: when in doubt, leave a breadcrumb.

**Example violation:**
```typescript
import { Cart } from "./types";
export function CartSidebar(props: { cart: Cart }) { /* 200 lines */ }
```

**Example compliance:**
```typescript
// Renders the cart sidebar; owns the line-item totals and the "checkout" CTA.
import { Cart } from "./types";
export function CartSidebar(props: { cart: Cart }) { /* 200 lines */ }
```

**Static tools:** `grep`

---

## U008

**Summary:** No commented-out code blocks longer than 5 lines.

**Why:** Dead code in comments rots — types drift, APIs change, and the next reader cannot tell whether the block is a future feature, a rollback fallback, or just forgotten. Git remembers every previous version of the file; commenting code out instead of deleting it is a non-trust in version control. Either delete it (and recover from git if needed) or move it behind a feature flag.

**Example violation:**
```python
def checkout(cart):
    # old pricing path — keeping in case we revert
    # for item in cart.items:
    #     item.price = legacy_price(item)
    #     item.tax = item.price * 0.08
    #     ...
    #     total += item.price + item.tax
    return new_checkout(cart)
```

**Example compliance:**
```python
def checkout(cart):
    return new_checkout(cart)
```

**Static tools:** `grep`

---

## U009

**Summary:** No hardcoded credentials, AWS keys, private keys, or `api_key="..."` patterns in source.

**Why:** Secrets in source are a security incident — once committed, they live in git history forever, get mirrored to every clone and CI cache, and rotate-after-leak takes hours or days of cleanup. They also defeat the principle that prod credentials should never touch a developer machine. Use a secret manager (Vault, AWS Secrets Manager, 1Password, environment variables in CI) so the source has only the *reference* to the secret.

**Example violation:**
```python
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
api_key = "sk_live_abcdef1234567890abcdef"
```

**Example compliance:**
```python
import os
AWS_KEY = os.environ["AWS_ACCESS_KEY_ID"]
api_key = secrets.get("stripe_api_key")
```

**Static tools:** `grep`

---

## U010

**Summary:** No `NotImplementedError` or `throw new Error("TBD")` on a main code path (allowed in tests).

**Why:** A stub on a main code path ships as a 500 the moment a user hits it — the rule exists because "I'll get to it next sprint" routinely ships to production. Either implement the path, remove the call site, or gate it behind a feature flag that defaults to off. Stubs are acceptable inside tests (mocking an unused dependency) but never in production-reachable code.

**Example violation:**
```python
def refund(order):
    raise NotImplementedError("Refunds coming in Q3")
```

**Example compliance:**
```python
def refund(order):
    if not feature_flags.is_enabled("refunds"):
        raise UserVisibleError("Refunds not yet available — please contact support.")
    return refund_v1(order)
```

**Static tools:** `grep`

---

## U011

**Summary:** No cross-file duplicate function signatures.

**Why:** When the same signature appears in multiple files, one of two things is happening — either there is a missing abstraction (both call sites want the same behaviour and should share an implementation), or the two implementations are diverging and will eventually disagree in subtle ways. Both lead to bugs: the first via copy-paste drift, the second via "which one runs?" ambiguity. Consolidating up-front prevents both.

**Example violation:**
```typescript
// src/orders/format.ts
export function formatMoney(cents: number, currency: string): string { ... }

// src/billing/format.ts
export function formatMoney(cents: number, currency: string): string { ... }
```

**Example compliance:**
```typescript
// src/shared/money.ts
export function formatMoney(cents: number, currency: string): string { ... }

// src/orders/format.ts → re-export or import
// src/billing/format.ts → import { formatMoney } from "../shared/money";
```

**Static tools:** `grep`

---

## TS001

**Summary:** No circular imports between TypeScript modules.

**Why:** Import cycles make module initialisation order undefined — at runtime, one of the two modules will see the other as `undefined` for a brief window, which becomes a heisenbug under hot-reload or lazy-loading. Cycles also break tree-shaking because bundlers cannot prove which exports are unused. The presence of a cycle nearly always points to a missing third module that both sides should depend on.

**Example violation:**
```typescript
// src/user.ts
import { Order } from "./order";
export class User { orders: Order[]; }

// src/order.ts
import { User } from "./user";
export class Order { owner: User; }
```

**Example compliance:**
```typescript
// src/types.ts — shared types, depends on nothing
export interface User { orders: Order[]; }
export interface Order { ownerId: string; }

// src/user.ts → import { User } from "./types";
// src/order.ts → import { Order } from "./types";
```

**Static tools:** `dependency-cruiser`

---

## TS002

**Summary:** Layer boundary: `src/ui/` may not import from `src/db/`.

**Why:** UI must not couple directly to storage — if it does, swapping the database becomes a UI refactor, and the test surface for the UI suddenly requires a real DB. A service layer (`src/services/`) sits between the two so the UI sees only domain types and the DB sees only persistence operations. This is the most-violated layering rule in practice, because the shortcut of `import { db } from "../db"` is just so easy.

**Example violation:**
```typescript
// src/ui/UserList.tsx
import { db } from "../db/connection";
export function UserList() {
  const users = db.query("SELECT * FROM users");
  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>;
}
```

**Example compliance:**
```typescript
// src/ui/UserList.tsx
import { listUsers } from "../services/users";
export function UserList() {
  const users = useQuery(listUsers);
  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>;
}
```

**Static tools:** `dependency-cruiser`

---

## TS003

**Summary:** No orphan modules — every TypeScript file should be imported by at least one other module (or be an entry point).

**Why:** Files that nothing imports are dead weight — they pass type-checking, they show up in code search, and the next reader wastes time figuring out whether they are load-bearing. Either delete them or wire them up. The orphan-file count is also a useful health metric: rising orphans usually mean refactors were left half-done.

**Example violation:**
```
src/utils/legacy-formatter.ts   ← imported by zero files since 2025-09 refactor
```

**Example compliance:** Delete the file (git remembers), or import it where it is actually used.

**Static tools:** `dependency-cruiser`

---

## TS004

**Summary:** No dev-dependency imports in production code.

**Why:** Dev deps (`devDependencies` in `package.json`) are not installed when the app is built for production — importing them from `src/` causes a runtime `Cannot find module` the first time the prod build executes. This rule catches accidental imports of test utilities, build tools, or `@types/*` packages from production paths.

**Example violation:**
```typescript
// src/api/handler.ts
import { faker } from "@faker-js/faker";  // ← devDependency
export function newUser() { return { name: faker.person.fullName() }; }
```

**Example compliance:**
```typescript
// Move faker to dependencies, OR replace with a prod-safe alternative:
import { randomName } from "../shared/random";
export function newUser() { return { name: randomName() }; }
```

**Static tools:** `dependency-cruiser`

---

## PY001

**Summary:** No relative imports — prefer absolute imports (ruff rule TID252).

**Why:** Relative imports (`from ..util import foo`) break the moment a file moves to a new package, because the `..` count changes. Absolute imports (`from myapp.util import foo`) survive refactors and grep-as-you-search. They also make the module's place in the package tree explicit, which helps the next reader.

**Example violation:**
```python
from ..util.formatting import money
from .helpers import normalise
```

**Example compliance:**
```python
from myapp.util.formatting import money
from myapp.orders.helpers import normalise
```

**Static tools:** `ruff`

---

## PY002

**Summary:** No unused imports (ruff rule F401).

**Why:** Unused imports inflate the module dependency graph (slowing startup), confuse the next reader ("why is `requests` imported if it's not used?"), and mask real intent during code review. They usually accumulate after refactors when a function was deleted but the import was left behind.

**Example violation:**
```python
import os
import json
import requests  # ← no longer used after the HTTP call moved
def load_config(path: str) -> dict:
    with open(path) as f:
        return json.load(f)
```

**Example compliance:**
```python
import json
def load_config(path: str) -> dict:
    with open(path) as f:
        return json.load(f)
```

**Static tools:** `ruff`

---

## PY003

**Summary:** No star imports (`from x import *`) — ruff rules F403 / F405.

**Why:** Star imports hide what is actually used — a reader cannot tell from the import line which names are pulled into the namespace, and grep stops working for "where is `foo` defined?". They also shadow local names silently when the upstream module adds a new export. Always import names explicitly.

**Example violation:**
```python
from sqlalchemy import *
from myapp.constants import *
session = Session()  # ← which module defines Session? unknowable without IDE help
```

**Example compliance:**
```python
from sqlalchemy import Session, select
from myapp.constants import DEFAULT_TIMEOUT
```

**Static tools:** `ruff`

---

## PY004

**Summary:** No mutable default arguments — ruff rule B006.

**Why:** Mutable default args (`def f(items=[])`) are the most famous Python footgun: the default is evaluated *once* at function-definition time, so every call that omits the argument shares the same list. This ships subtle bugs where state leaks between unrelated calls. Use `None` as the sentinel and create a fresh container inside the body.

**Example violation:**
```python
def append_tag(tag: str, tags: list[str] = []) -> list[str]:
    tags.append(tag)
    return tags
# second call sees the first call's tag!
```

**Example compliance:**
```python
def append_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    tags = list(tags) if tags is not None else []
    tags.append(tag)
    return tags
```

**Static tools:** `ruff`

---

## PY005

**Summary:** No functions with cyclomatic complexity above the configured threshold (ruff rule C901).

**Why:** Cyclomatic complexity counts the number of independent paths through a function — every `if` / `elif` / `and` / `or` / `for` / `while` / `except` adds one. A function with high complexity is hard to read (the reader has to hold every branch in working memory) and harder to test (each branch needs its own test case). Decomposing into helpers caps complexity per function and makes the design explicit.

**Example violation:**
```python
def categorise(order):  # complexity = 14
    if order.country == "US":
        if order.total > 1000:
            if order.customer.is_vip:
                ...
            elif order.customer.is_new:
                ...
        elif order.total > 100:
            ...
    elif order.country in EU_COUNTRIES:
        ...
```

**Example compliance:**
```python
def categorise(order):
    region = pick_region(order.country)
    tier = pick_tier(order.total)
    segment = pick_segment(order.customer)
    return Category(region, tier, segment)
```

**Static tools:** `ruff`

---

## PY006

**Summary:** No functions with too many returns / branches / arguments / statements (ruff rules PLR0911, PLR0912, PLR0913, PLR0915).

**Why:** A function that crosses any of these thresholds is doing too much — the limits are heuristics for "this should be split". Too many returns hides the exit conditions; too many branches hides the control flow; too many arguments hides what the function actually depends on; too many statements hides the phases. Each split surfaces a name that the design was previously hiding.

**Example violation:**
```python
def handle_request(a, b, c, d, e, f, g, h):  # 8 args
    if ...: return ...
    if ...: return ...
    if ...: return ...
    # ... 8 returns, 12 branches, 60 statements
```

**Example compliance:**
```python
def handle_request(req: Request) -> Response:
    validated = validate(req)
    routed = route(validated)
    return execute(routed)
```

**Static tools:** `ruff`

---

## PY007

**Summary:** No magic values in comparisons — ruff rule PLR2004.

**Why:** Bare numeric or string literals in conditions (`if status == 4:`) hide intent — the reader cannot tell what `4` means without grepping for the enum or asking the original author. Named constants make the condition self-documenting and give grep a single point of change when the value moves.

**Example violation:**
```python
if order.status == 4:
    archive(order)
if response.code == 429:
    retry()
```

**Example compliance:**
```python
ORDER_STATUS_CANCELLED = 4
HTTP_TOO_MANY_REQUESTS = 429
if order.status == ORDER_STATUS_CANCELLED:
    archive(order)
if response.code == HTTP_TOO_MANY_REQUESTS:
    retry()
```

**Static tools:** `ruff`

---

## PY008

**Summary:** No unused function or method arguments — ruff rules ARG001 / ARG002.

**Why:** Unused arguments mislead callers about what the function actually consumes — the caller assumes the value matters and spends effort computing it. They also accumulate after refactors when a parameter was made obsolete but the signature was left unchanged for "compatibility". Either remove the arg or prefix it with `_` to mark the unused-on-purpose case (e.g. callback signatures).

**Example violation:**
```python
def render(template, context, request, user):  # `user` never read
    return template.render(context | {"req": request})
```

**Example compliance:**
```python
def render(template, context, request):
    return template.render(context | {"req": request})
# or, if the interface is fixed (e.g. a framework callback):
def render(template, context, request, _user):
    return template.render(context | {"req": request})
```

**Static tools:** `ruff`

---

## PY009

**Summary:** No import cycles between Python modules.

**Why:** Python import cycles cause subtle init-order bugs — at the moment of import, one module sees the other as a half-built module object with some attributes missing. The bug typically surfaces as `AttributeError: module 'x' has no attribute 'y'` only when imports happen in a particular order (e.g. a different test runner, a new entry point). The fix is almost always a third module that owns the shared types both sides depend on (mirror of TS001).

**Example violation:**
```python
# myapp/user.py
from myapp.order import Order
class User:
    orders: list[Order]

# myapp/order.py
from myapp.user import User
class Order:
    owner: User
```

**Example compliance:**
```python
# myapp/types.py  — shared types, depends on nothing in user.py / order.py
from dataclasses import dataclass
@dataclass
class User: ...
@dataclass
class Order: ...

# myapp/user.py  → from myapp.types import User, Order
# myapp/order.py → from myapp.types import User, Order
```

**Static tools:** `cycle-py`
