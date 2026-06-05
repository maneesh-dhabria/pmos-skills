# Survey platform export / import reference

Loaded on demand by `/survey-design` Phase 8. The per-platform **type-mapping tables** here are what the Phase-8 transformer recipes (in `SKILL.md`) cite when they turn `survey.json` into a platform artifact. The transformers are deterministic recipes (same `survey.json` → same output bytes), not a runtime API call — the skill never hits a survey platform's API; it emits an import file plus an `export/README.md` with the import steps and auth requirements.

`survey.json` question `type` enum referenced below: `single_select`, `multi_select`, `forced_choice_grid`, `rating`, `nps`, `dichotomous`, `open_short`, `open_long`, `ranking`, `matrix`, `constant_sum`, `multi_field_open`, `statement`.

## Contents

- Typeform · SurveyMonkey · Google Forms · Qualtrics (stretch) · Microsoft Forms (not supported) · Sources

> **`multi_field_open` — labeled multi-input.** A shared stem + one single-line free-text input per `fields[]` entry (`{id,label,placeholder}`). Some platforms have a native "multiple textboxes" question that round-trips the field labels; others don't, and the canonical downgrade is **N short-answer items preceded by a section-header / statement block** naming the original grouped question, with each `field.label` becoming a separate item title. Per-platform: SurveyMonkey → **native** (`open_ended` / `multi`, `answers.rows[]` = the field labels); Qualtrics → **native** (`Matrix` / `TE` text-entry matrix, `Answers` = the field labels); Typeform → **downgrade** (no labeled-multi-input field); Google Forms → **downgrade** (no native multi-textbox item).

> **Qualtrics is documented here for completeness, but the v1 transformer is a stretch.** If no `survey.qsf` transformer ships, the Phase-8 `AskUserQuestion` must not offer Qualtrics as a choice. The QSF section below lets a later iteration add it without re-researching. Microsoft Forms is intentionally **not** supported — no usable programmatic import path (see the note at the end).

Recommended emitted artifacts: Typeform → `export/typeform.json`; SurveyMonkey → `export/surveymonkey.json` **plus** `export/surveymonkey-paste.txt`; Google Forms → `export/build-google-form.gs`; Qualtrics (if shipped) → `export/survey.qsf`. Always also write `export/README.md`. `export/README.md` lists every downgrade per chosen platform — including, for any platform that downgrades a `multi_field_open` question (Typeform, Google Forms), a line like "the *<grouped question stem>* was split into N short-answer items preceded by a section header" — and a meaning-changing downgrade is also flagged as a comment in the artifact itself at the downgrade site.

---

## Typeform

**Best import target of any platform.** Rich field types, logic jumps, welcome/thank-you screens, and validations all travel in one JSON body.

**Import mechanisms, ranked best → worst:**
1. **Create API — `POST https://api.typeform.com/forms`** with a complete form definition as JSON; returns `201` + a `Location` header. *Recommended.*
2. UI import from Google Forms / "Typeform AI" — paste text into Typeform AI; lossy and non-deterministic (section headers become Statement blocks, images dropped). Don't build the artifact around this.
3. "Duplicate" an existing Typeform in the UI (only useful if you already have one).

There is **no CSV import**.

**Artifact = `export/typeform.json`** (Create-API body). Example:
```json
{
  "title": "Customer Feedback Survey",
  "type": "branching",
  "settings": { "language": "en", "progress_bar": "proportion", "is_public": true },
  "welcome_screens": [
    { "ref": "welcome", "title": "We'd love your feedback", "properties": { "show_button": true, "button_text": "Start" } }
  ],
  "fields": [
    { "ref": "satisfaction", "title": "How satisfied are you with our product?", "type": "opinion_scale",
      "properties": { "steps": 5, "start_at_one": true, "labels": { "left": "Not at all", "right": "Extremely" } },
      "validations": { "required": true } },
    { "ref": "features_used", "title": "Which features do you use?", "type": "multiple_choice",
      "properties": { "allow_multiple_selection": true, "allow_other_choice": true,
        "choices": [ { "ref": "c_dash", "label": "Dashboard" }, { "ref": "c_reports", "label": "Reports" }, { "ref": "c_api", "label": "API" } ] },
      "validations": { "required": false } },
    { "ref": "improve", "title": "What should we improve?", "type": "long_text", "validations": { "required": false } },
    { "ref": "recommend", "title": "Would you recommend us?", "type": "yes_no", "validations": { "required": true } }
  ],
  "logic": [
    { "type": "field", "ref": "recommend", "actions": [
      { "action": "jump", "details": { "to": { "type": "field", "value": "improve" } },
        "condition": { "op": "is", "vars": [ { "type": "field", "value": "recommend" }, { "type": "constant", "value": false } ] } } ] }
  ],
  "thankyou_screens": [
    { "ref": "thanks", "title": "Thanks — your feedback helps!", "properties": { "show_button": false } }
  ]
}
```

**Field shape.** Every field carries `ref` (a stable id, used as a logic target), `title`, `type`, `properties`, `validations.required`, optionally `attachment`/`layout`. Key per-type properties: `short_text`/`long_text` (`properties.description`, `validations.max_length`); `multiple_choice` (`properties.choices[]` each `{ref,label}`, `allow_multiple_selection`, `allow_other_choice`, `randomize`; `validations.min_selection`/`max_selection`); `dropdown` (`choices[]`, `alphabetical_order`); `opinion_scale` (`steps` 5–11, `start_at_one`, `labels.{left,center,right}`); `rating` (`steps` 1–10/11, `shape`: star/heart/up/cat/circle); `yes_no`; `ranking` (`choices[]`); `nps`; `matrix`; `number`/`email`/`phone_number`/`website`/`date`/`file_upload`/`legal`/`statement`/`group` (nested). Screens: `welcome_screens[]` + `thankyou_screens[]` with `ref`, `title`, `properties` (`show_button`, `button_text`, `redirect_url`). `logic[]`: `{type:"field", ref, actions:[{action:"jump"|"add"|"set", details, condition:{op, vars}}]}`.

**Type mapping (`survey.json` → Typeform):**

| `survey.json` type | Typeform `type` | Notes / downgrade |
|---|---|---|
| `single_select` | `multiple_choice` (`allow_multiple_selection:false`) | native |
| `multi_select` | `multiple_choice` (`allow_multiple_selection:true`) | native; set `allow_other_choice` from `other_option` |
| `forced_choice_grid` | `matrix` | native; rows → matrix rows, Yes/No (+N/A) → matrix columns |
| `rating` | `opinion_scale` (or `rating` if `survey.json` asked for a star scale) | native; carry `scale.labels` into `properties.labels` |
| `nps` | `nps` | native |
| `dichotomous` | `yes_no` | native (if a third "Don't know" option exists, downgrade to `multiple_choice`) |
| `open_short` | `short_text` | native |
| `open_long` | `long_text` | native |
| `ranking` | `ranking` | native |
| `matrix` | `matrix` | native; rows → matrix rows, scale points → matrix columns |
| `constant_sum` | `number` per item + a `statement` explaining "must total N" | **downgrade** — Typeform has no native constant-sum; document it |
| `multi_field_open` | a `statement` field naming the grouped question, then one `short_text` field per `field` (title = `field.label`, `properties.description` = `field.placeholder`) | **downgrade** — Typeform has no labeled-multi-input field; the statement carries the original stem; comment the downgrade in `export/README.md` |
| `statement` | `statement` | native |
| `opt_out_options` / `other_option` | `allow_other_choice` and/or an extra choice | native on `multiple_choice` |
| `skip_logic` | `logic[]` entry on the source field's `ref` | `action:"jump"` to `target_section_id`'s first field, or to the thank-you screen for `end_survey` |

A meaning-changing downgrade (e.g. `constant_sum`) is also flagged as a comment in `export/README.md` for that artifact.

**Auth / limits.** Bearer token — a personal access token (Settings → Personal tokens) or OAuth 2.0; scope `forms:write`. The Create API works on free plans, but premium-only *settings* (remove branding, custom thank-you redirect, the richest logic) are ignored or rejected on free. Images must be pre-uploaded via `POST /images`. Rate limit ≈ 2 req/sec. README snippet: `curl -X POST https://api.typeform.com/forms -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @typeform.json`.

---

## SurveyMonkey

**Import mechanisms, ranked best → worst:**
1. **`POST https://api.surveymonkey.com/v3/surveys`** with nested `pages[].questions[]` — creates the entire survey in one call. *Recommended programmatic path.*
2. `POST /v3/surveys` with `from_template_id` / `from_survey_id` to clone, then PATCH.
3. UI "Import Questions → Paste your content" — paste plain text; **only Multiple Choice + Single Textbox are parsed**. A useful low-tech fallback → emit `export/surveymonkey-paste.txt` alongside the JSON.

**Artifact = `export/surveymonkey.json`** (POST /v3/surveys body). Example:
```json
{
  "title": "Customer Feedback Survey",
  "nickname": "cust-feedback-2026",
  "language": "en",
  "pages": [
    { "title": "About your experience", "description": "", "questions": [
        { "family": "single_choice", "subtype": "vertical",
          "headings": [ { "heading": "How satisfied are you overall?" } ],
          "answers": { "choices": [ { "text": "Very satisfied" }, { "text": "Satisfied" }, { "text": "Neither satisfied nor dissatisfied" }, { "text": "Dissatisfied" }, { "text": "Very dissatisfied" } ] },
          "required": { "text": "This question requires an answer.", "type": "all" } },
        { "family": "multiple_choice", "subtype": "vertical",
          "headings": [ { "heading": "Which features do you use?" } ],
          "answers": { "choices": [ { "text": "Dashboard" }, { "text": "Reports" }, { "text": "API" } ], "other": { "text": "Other (please specify)", "is_answer_choice": true } } },
        { "family": "matrix", "subtype": "rating",
          "headings": [ { "heading": "Rate the following:" } ],
          "answers": { "rows": [ { "text": "Ease of use" }, { "text": "Customer support" } ], "choices": [ { "text": "Poor", "weight": 1 }, { "text": "Fair", "weight": 2 }, { "text": "Good", "weight": 3 }, { "text": "Excellent", "weight": 4 } ] } },
        { "family": "open_ended", "subtype": "essay", "headings": [ { "heading": "What should we improve?" } ] },
        { "family": "open_ended", "subtype": "single", "headings": [ { "heading": "Your role / job title (optional)" } ] }
    ] }
  ]
}
```

**Question families & subtypes.** `single_choice` (`vertical`/`horizontal`/`menu`=dropdown; `answers.choices[]`, optional `answers.other`); `multiple_choice` (`vertical`/`horizontal`; `answers.choices[]`, `answers.other`); `matrix` (`single`=radio matrix, `rating`=rating scale with `weight`s, `multi`=checkbox matrix, `menu`, `ranking`; `answers.rows[]` + `answers.choices[]`); `open_ended` (`single`=single textbox, `multi`=multiple textboxes via `answers.rows[]`, `essay`=comment box, `numerical`); `demographic`; `datetime`; `presentation` (`descriptive_text`/`image`); `slider`, `file_upload`. Per-question: `headings[]` (`heading`, optional `description`/`image`), `required` (`{text, type, amount?}`), `position`, `visible`, `validation` (`{type:"integer"|"decimal"|..., min, max, sum, sum_text, text}`), `forced_ranking`. Skip logic is more complex (display options / question updates) — emit conservatively or document as a manual step. A survey needs ≥ 1 page with ≥ 1 question to collect responses.

**Type mapping (`survey.json` → SurveyMonkey):**

| `survey.json` type | SurveyMonkey `family` / `subtype` | Notes / downgrade |
|---|---|---|
| `single_select` | `single_choice` / `vertical` | native; `answers.other` from `other_option` |
| `multi_select` | `multiple_choice` / `vertical` | native; `answers.other` from `other_option` |
| `forced_choice_grid` | `matrix` / `single` | native; rows → `answers.rows[]`, Yes/No (+N/A) → `answers.choices[]` |
| `rating` | `matrix` / `rating` with one row, or `single_choice` if 1 row | native; carry `scale.labels` into choice texts; `weight` 1..N |
| `nps` | `single_choice` / `horizontal` with 0..10 choices | **partial downgrade** — SurveyMonkey's true NPS question is a paid add-on; a 0–10 single-choice carries the data; note it |
| `dichotomous` | `single_choice` / `vertical` (Yes/No) | native |
| `open_short` | `open_ended` / `single` | native |
| `open_long` | `open_ended` / `essay` | native |
| `ranking` | `matrix` / `ranking` (`forced_ranking:true`) | native |
| `matrix` | `matrix` / `single` (or `rating` for a numeric scale) | native; rows → `answers.rows[]`, scale points → `answers.choices[]` |
| `constant_sum` | `open_ended` / `numerical`, one per item + `validation.sum` = total | **downgrade** — emulated with numeric items summing to the target; document it |
| `multi_field_open` | `open_ended` / `multi` (multiple-textboxes), `answers.rows[]` = the `fields[]` labels | **native** — SurveyMonkey's multiple-textbox question round-trips the labeled inputs; one question, one heading = the stem |
| `statement` | `presentation` / `descriptive_text` | native |

**Auth / limits.** OAuth 2.0 Bearer; the app needs the "Create/modify surveys" scope. **API access requires a paid plan (Team Advantage / Enterprise) — not free/basic.** Free dev-portal apps: 120 calls/min, 500/day. If the user is on a free plan, the paste-import fallback (`export/surveymonkey-paste.txt`, MC + single-textbox only) is the only no-code path — `export/README.md` must say so. README snippet: `curl -X POST https://api.surveymonkey.com/v3/surveys -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @surveymonkey.json`.

---

## Google Forms

**Import mechanisms, ranked best → worst:**
1. **Google Apps Script (`FormApp`)** — generate a self-contained `.gs`; the user goes to script.google.com → New project → paste → Run; the first run prompts for Drive/Forms authorization. Most reliable, no OAuth app setup, full type control. *Recommended artifact.*
2. Google Forms REST API — `forms.create` then `forms.batchUpdate` with `createItem` requests (`https://forms.googleapis.com/v1/forms`); same power, needs an OAuth client + token (`https://www.googleapis.com/auth/forms.body`). Optionally also emit `export/forms-api.json` (the batchUpdate payload) for REST users.
3. Third-party add-ons ("Form Builder for Sheets", etc.) that read a Google Sheet — unreliable across versions, limited type mapping. Mention only.
4. There is **no native "import questions" UI** (you can only import from another Google Form).

**Artifact = `export/build-google-form.gs`** (Apps Script). Example:
```javascript
function buildSurvey() {
  var form = FormApp.create('Customer Feedback Survey');
  form.setDescription('We appreciate your feedback. Your responses are confidential.');
  form.setProgressBar(true);
  form.addSectionHeaderItem().setTitle('About your experience');
  form.addMultipleChoiceItem()
    .setTitle('How satisfied are you overall?')
    .setChoiceValues(['Very satisfied', 'Satisfied', 'Neither satisfied nor dissatisfied', 'Dissatisfied', 'Very dissatisfied'])
    .setRequired(true);
  var cb = form.addCheckboxItem();
  cb.setTitle('Which features do you use?').setChoiceValues(['Dashboard', 'Reports', 'API']).showOtherOption(true).setRequired(false);
  form.addScaleItem().setTitle('How likely are you to recommend us?').setBounds(0, 10).setLabels('Not at all likely', 'Extremely likely').setRequired(true); // NPS downgraded to a 0-10 scale
  form.addPageBreakItem().setTitle('Open feedback');
  form.addParagraphTextItem().setTitle('What should we improve?').setRequired(false);
  form.addGridItem().setTitle('Rank these features (1 = most important)').setRows(['Reports', 'API', 'Mobile app']).setColumns(['1', '2', '3']); // ranking downgraded to a grid
  Logger.log('Form URL: ' + form.getEditUrl());
  Logger.log('Published URL: ' + form.getPublishedUrl());
}
```

**Key `FormApp` surface.** `FormApp.create(title)` → `Form`; `form.setTitle/setDescription/setProgressBar/setCollectEmail/setIsQuiz/setAllowResponseEdits/setConfirmationMessage`. Item adders: `addMultipleChoiceItem()` (radio), `addCheckboxItem()` (multi-select), `addListItem()` (dropdown), `addTextItem()` (short answer), `addParagraphTextItem()` (long answer), `addScaleItem()` (linear scale), `addRatingItem()` (star/heart rating), `addGridItem()` (radio matrix), `addCheckboxGridItem()` (checkbox matrix), `addDateItem()`, `addSectionHeaderItem()`, `addPageBreakItem()`, `addImageItem()`. Common item methods: `setTitle()`, `setHelpText()`, `setRequired(bool)`. Choice items: `setChoiceValues([...])` (or `setChoices([item.createChoice(...)])`), `showOtherOption(bool)`; section navigation via `createChoice(value, FormApp.PageNavigationType.JUMP_TO_PAGE)` / `setGoToPage(pageBreakItem)`. Scale: `setBounds(min, max)` (min 0 or 1; max ≤ 10), `setLabels(lower, upper)`. Grid: `setRows([...])`, `setColumns([...])`.

**Type mapping (`survey.json` → Google Forms) — note the downgrades:**

| `survey.json` type | Google Forms item | Notes / downgrade |
|---|---|---|
| `single_select` | `addMultipleChoiceItem` | native; `showOtherOption(true)` from `other_option` |
| `multi_select` | `addCheckboxItem` | native; `showOtherOption(true)` from `other_option` |
| `forced_choice_grid` | `addGridItem` (rows = items, columns = Yes / No / N/A) | native via grid |
| `rating` | `addScaleItem` (`setBounds`, `setLabels`) — or `addMultipleChoiceItem` if labels per point matter | native-ish |
| `nps` | `addScaleItem` with `setBounds(0, 10)` | **downgrade** — no native NPS; the 0–10 scale carries the data; note it |
| `dichotomous` | `addMultipleChoiceItem` (Yes / No, +Don't know) | native |
| `open_short` | `addTextItem` | native |
| `open_long` | `addParagraphTextItem` | native |
| `ranking` | `addGridItem` (rows = items, columns = ranks 1..N) | **downgrade** — no native ranking; a grid emulates "rank each"; note it |
| `matrix` | `addGridItem` (rows = items, columns = scale points) | native via grid |
| `constant_sum` | one `addTextItem` per item + a help-text note "must total N" | **downgrade** — no native constant-sum; can't enforce the sum in Forms; note it |
| `multi_field_open` | `addSectionHeaderItem().setTitle(<stem>)`, then one `addTextItem().setTitle(<field.label>).setHelpText(<field.placeholder>)` per `field` | **downgrade** — Google Forms has no native multi-textbox item; the section header carries the original stem; comment the downgrade in the `.gs` and list it in `export/README.md` |
| `statement` | `addSectionHeaderItem` | native (display only) |
| section break | `addPageBreakItem().setTitle(...)` | one page break per `survey.json` section after the first |
| `skip_logic` | `createChoice(value, JUMP_TO_PAGE)` on a multiple-choice item | only "go to section based on answer" on multiple-choice/dropdown; `end_survey` → `FormApp.PageNavigationType.SUBMIT` |

Every downgrade (NPS → scale, ranking → grid, constant-sum → text items) is listed in `export/README.md`; a meaning-changing one is also a comment in the `.gs` (as in the example above).

**Auth / limits.** Apps Script runs as the signed-in user; the first run prompts for Drive/Forms authorization — no API keys. The REST path needs OAuth 2.0 with `https://www.googleapis.com/auth/forms.body`. Apps Script daily quotas apply (form creation is cheap). Conditional logic is limited to "go to section based on answer" on multiple-choice/dropdown items. README snippet: "Open script.google.com → New project → paste `build-google-form.gs` → Run `buildSurvey` → approve the authorization prompt → the form URL is logged."

---

## Qualtrics (stretch — enterprise only)

**Import mechanisms, ranked best → worst:**
1. **UI: Survey → Tools → Import/Export → Import Survey → upload `.qsf`** (or an advanced-format TXT). The primary intended path.
2. API: `POST /API/v3/survey-definitions?format=qsf` with the QSF JSON body and an `X-API-TOKEN` header. (Also `POST /API/v3/survey-definitions` for a leaner non-QSF survey, then `POST .../questions`, `POST .../blocks`, `PUT .../flow`, `PUT .../options` — but the leaner export omits the display/skip/flow logic the QSF carries.)
3. Copy a survey within Qualtrics.

**Artifact = `export/survey.qsf`** (plain JSON; abbreviated):
```json
{
  "SurveyEntry": { "SurveyID": "SV_PLACEHOLDER", "SurveyName": "Customer Feedback Survey", "SurveyStatus": "Inactive", "SurveyLanguage": "EN" },
  "SurveyElements": [
    { "Element": "BL", "PrimaryAttribute": "Survey Blocks", "Payload": [ { "Type": "Default", "Description": "Default Block", "ID": "BL_1", "BlockElements": [ { "Type": "Question", "QuestionID": "QID1" }, { "Type": "Question", "QuestionID": "QID2" } ] } ] },
    { "Element": "FL", "PrimaryAttribute": "Survey Flow", "Payload": { "Flow": [ { "Type": "Block", "ID": "BL_1", "FlowID": "FL_1" } ], "Properties": { "Count": 1 } } },
    { "Element": "SO", "PrimaryAttribute": "Survey Options", "Payload": { "BackButton": "true", "ProgressBarDisplay": "Text" } },
    { "Element": "SQ", "PrimaryAttribute": "QID1", "Payload": { "QuestionText": "How satisfied are you overall?", "QuestionID": "QID1", "QuestionType": "MC", "Selector": "SAVR", "SubSelector": "TX", "Choices": { "1": {"Display":"Very satisfied"}, "2":{"Display":"Satisfied"}, "3":{"Display":"Neither satisfied nor dissatisfied"}, "4":{"Display":"Dissatisfied"}, "5":{"Display":"Very dissatisfied"} }, "ChoiceOrder": ["1","2","3","4","5"], "Validation": { "Settings": { "ForceResponse": "ON" } } } },
    { "Element": "SQ", "PrimaryAttribute": "QID2", "Payload": { "QuestionText": "What should we improve?", "QuestionID": "QID2", "QuestionType": "TE", "Selector": "ESTB" } }
  ]
}
```

**QSF essentials.** A `SurveyEntry` object plus a `SurveyElements` array; each element has an `Element` code (`SQ` = survey question, `BL` = blocks, `FL` = flow, `SO` = survey options, `RS` = response set, `PL` = player options, …). Question types: `MC` (Selector `SAVR` single / `MAVR` multi / `DL` dropdown), `TE` (text entry; Selector `SL`/`ML`/`ESTB`/`FORM`), `Matrix` (Selector `Likert`/`TE`/`Bipolar`; `Answers` = rows, `Choices` = columns), `Slider`, `RO` (rank order), `NPS`, `DB` (descriptive text), `CS` (constant sum), `SBS` (side-by-side).

**Type mapping (`survey.json` → Qualtrics QSF):**

| `survey.json` type | Qualtrics `QuestionType` / `Selector` | Notes |
|---|---|---|
| `single_select` | `MC` / `SAVR` | native |
| `multi_select` | `MC` / `MAVR` | native |
| `forced_choice_grid` | `Matrix` / `Likert` (columns = Yes/No/N/A) | native via matrix |
| `rating` | `Matrix` / `Likert` (one statement) or `MC` / `SAVR` | native |
| `nps` | `NPS` | native |
| `dichotomous` | `MC` / `SAVR` (Yes/No) | native |
| `open_short` | `TE` / `SL` | native |
| `open_long` | `TE` / `ESTB` | native |
| `ranking` | `RO` | native |
| `matrix` | `Matrix` / `Likert` | native |
| `constant_sum` | `CS` | native |
| `multi_field_open` | `Matrix` / `TE` (text-entry matrix), `Answers` = the `fields[]` labels (single text column) | **native** — Qualtrics's text-entry matrix round-trips the labeled inputs |
| `statement` | `DB` | native |

QSF maps every `survey.json` type natively — that's why it's the "completeness" reference even though the v1 transformer is a stretch.

**Auth / limits.** `X-API-TOKEN` header (the user's API token from Account Settings → Qualtrics IDs); only works if the org's license enables the API. Datacenter-specific base URL. Enterprise / institutional — no consumer free tier. The recommendation is QSF + manual UI import, not API upload.

---

## Microsoft Forms — not supported

The only import path is "Quick Import" of a Word (.docx) or PDF document (Forms → New → Quick Import), which OCRs/parses the document and recognizes only titles/subtitles, multiple-choice, and open-text — no rating / ranking / Likert / date. There is no Excel import and no supported public API for *creating* forms (the form-creation Graph endpoints are undocumented/unsupported). The skill does not emit a Microsoft Forms artifact; if a user names it, point them at one of the supported platforms.

---

## Sources

- Typeform — *Create a form* (https://www.typeform.com/developers/create/reference/create-form/); *Create API overview* (https://www.typeform.com/developers/create/); *Import from Google Forms* (https://www.typeform.com/help/a/create-new-forms-by-importing-from-google-forms-4402931979028/); *Import questions from external sources* (https://help.typeform.com/hc/en-us/articles/19585703741332-Import-questions-into-Typeform-from-external-sources).
- SurveyMonkey — *Surveys API* (https://github.com/SurveyMonkey/public_api_docs/blob/main/includes/_surveys.md); *Questions API* (https://github.com/SurveyMonkey/public_api_docs/blob/main/includes/_questions.md); *API reference* (https://api.surveymonkey.com/v3/docs); *Importing surveys* (https://help.surveymonkey.com/en/surveymonkey/create/importing-surveys/); *Copy/paste questions* (https://help.surveymonkey.com/en/surveymonkey/create/copy-paste-questions/).
- Google — *Apps Script Forms `Form`* (https://developers.google.com/apps-script/reference/forms/form); *`MultipleChoiceItem`* (https://developers.google.com/apps-script/reference/forms/multiple-choice-item); *Forms API `batchUpdate`* (https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/batchUpdate).
- Microsoft — *Convert a Word or PDF to Microsoft Forms* (https://support.microsoft.com/en-us/office/convert-a-word-or-pdf-form-or-quiz-to-microsoft-forms-66b7e9bc-eb0d-4c65-b7e6-f9f92dcd71cb); *Import from Excel?* (https://learn.microsoft.com/en-us/answers/questions/944000/how-can-we-import-questions-from-excel-to-forms).
- Qualtrics — *Import and export surveys* (https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/import-and-export-surveys/); QSF internals gist (https://gist.github.com/ctesta01/d4255959dace01431fb90618d1e8c241); *QSF file guide* (https://piraiai.com/blog/qsf-file-guide); community thread on `survey-definitions` vs. QSF export (https://community.qualtrics.com/qualtrics-api-13/exporting-survey-details-to-txt-or-qsf-format-2517).
