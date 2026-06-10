# Mock Data Generation Prompt

Used by the `#mock-data` phase. Dispatch ONE subagent with this prompt template, the requirements doc, the wireframes, and any workstream domain hint.

## Inputs to the subagent

1. **Requirements doc text** — full contents
2. **Wireframes visible-field summary** — extracted by main agent before dispatch:
   - Run grep across `wireframes/*.html` for `<th>`, `<label>`, `<dt>` text and any `data-field` attributes
   - Build a structured list: `{screen, fieldsShown: [name1, name2, …], approxRowCount: N (from wireframe row visible)}`
3. **Workstream domain hint** — if `#pipeline-setup` loaded one, pass the `## Tech Stack` and `## Domain Notes` sections verbatim
4. **Output folder path** — `{feature_folder}/prototype/assets/`

## Prompt template (sent to subagent verbatim)

```
You are generating mock data for an interactive prototype. The prototype must feel domain-real to stakeholders — generic placeholders kill the demo.

DOMAIN CONTEXT:
{workstream_domain_hint or "No specific domain context provided. Infer domain from the requirements doc below."}

REQUIREMENTS DOC:
<<<
{full_requirements_doc}
>>>

WIREFRAMES VISIBLE-FIELD SUMMARY:
<<<
{visible_field_summary}
>>>

YOUR TASK:

1. Identify every entity the prototype needs. Sources of truth, in priority order:
   a. Explicit entity model in the requirements doc
   b. Field clusters that recur in the wireframes (e.g., a list view + detail view + edit form for the same noun)
   c. Foreign-key references implied by labels (e.g., "Assigned to" implies a user reference)

2. For each entity, decide a record count:
   - List/feed/table views with visible scrolling → 50–200 records
   - Static list of small fixed cardinality (e.g., status options) → 3–10 records
   - Detail-only entity referenced from another → 5–20 records (enough variety to demo edge cases)

3. Generate ONE JSON file per entity at `{output_folder}/<entity>.json`. The file is a JSON array of records.

4. Every record must have:
   - `id`: stable string id (UUID-style or kebab-case slug; consistent within an entity)
   - All fields shown in the wireframes for that entity
   - Reasonable defaults for fields the req doc requires but the wireframes don't display
   - `createdAt` / `updatedAt` ISO timestamps if the entity has temporal aspects

5. DOMAIN REALISM RULES:
   - Names: real-looking person names from a diverse set (avoid only Anglo names; mix gender, ethnicity, region)
   - Companies, products, places: plausible for the domain — if it's a B2B SaaS for restaurants, generate restaurant names; if it's healthcare, generate clinic names
   - Money: realistic price ranges for the implied tier (consumer SaaS = $9–$99/mo; enterprise = $500–$50k/mo)
   - Dates: spread across the last 90 days for "recent activity" entities; spread across years for tenure/age fields
   - Text fields (descriptions, comments, notes): write like a real user would — abbreviations, context-specific jargon, occasional typos in casual fields, polished prose in formal fields
   - NO Lorem ipsum, NO "User 1 / Item A", NO "test", NO obvious placeholder strings

6. REFERENTIAL INTEGRITY:
   - Foreign keys must point to real ids in the referenced entity
   - Cross-entity relationships must look plausible (a $10 order doesn't have 50 line items)
   - When an entity references many of another (one user has many orders), generate the distribution as a power law (most users have 1–3, a few have 50+) not uniform

7. EDGE CASES (~10% of records each):
   - Long names / long text fields (test layout breakage)
   - Empty optional fields (test "—" rendering)
   - Special characters in names (José, O'Brien, 北京)
   - Maximum-cardinality (a user with 200 orders)
   - Boundary values (price = 0, quantity = 1, just-created)

8. Write a summary index at `{output_folder}/mock-data.json`:

   {
     "generatedAt": "<ISO timestamp>",
     "seed": "<random seed string for reproducibility notes>",
     "entities": [
       {"name": "users", "count": 87, "file": "users.json", "fields": ["id", "name", "email", …]},
       …
     ]
   }

OUTPUT: Write each JSON file using the Write tool. Do NOT print large JSON to chat. Confirm completion with a short summary listing entity names and counts.

ABSOLUTE PROHIBITIONS:
- Lorem ipsum
- "User 1", "User 2", "Test User", "Sample Item"
- Identical names across multiple users
- Foreign keys that don't resolve
- Empty entity files
- Any field marked required in the req doc being null
```

## Post-generation validation (main agent runs after subagent returns)

Before presenting to the user:

```bash
# 1. Every entity file is valid JSON, non-empty
for f in {feature_folder}/prototype/assets/*.json; do
  python3 -c "import json; data=json.load(open('$f')); assert len(data)>0 if not '$f'.endswith('mock-data.json') else True" \
    || echo "INVALID: $f"
done

# 2. No Lorem ipsum
grep -i 'lorem\|ipsum' {feature_folder}/prototype/assets/*.json && echo "FOUND LOREM IPSUM"

# 3. No "User N" / "Item N" patterns
grep -E '"(User|Item|Test) [0-9]+"' {feature_folder}/prototype/assets/*.json && echo "FOUND PLACEHOLDER PATTERN"

# 4. Referential integrity (manual spot check on 1-2 FK relationships)
```

If any check fails, re-prompt the subagent with the specific failure and ask for a targeted fix (no full regen unless multiple checks fail).

## User review summary

Present to user via `AskUserQuestion`:

```
Mock data generated:
- users.json: 87 records (sample: Sarah Chen, Marcus Okonkwo, Priya Raman)
- products.json: 142 records (sample: "Bistro Romano POS Bundle", "Coastal Catering Plus")
- orders.json: 230 records (referencing 87 users × 142 products)

Approve / Edit before continuing / Regenerate?
```
