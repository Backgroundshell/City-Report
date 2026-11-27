# CityReport

**Language / Język:** [English](README.md) | [Polski](README.pl.md)

CityReport is a web application for reporting urban infrastructure problems, including potholes, broken streetlights, damaged pavements, overflowing bins, and maintenance issues. Residents submit reports with locations and optional photos; administrators manage repairs, priorities, city-service correspondence, and a local AI assistant. The interface uses Polish labels.

## Run locally

```powershell
python app.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000/). Restart the Python process after backend updates, then refresh the browser. Startup adds missing database tables and columns without deleting existing reports or accounts. On Windows, startup logs use UTF-8, including when redirected to a file.

## Top navigation

All blue **CR** logo badges use a fixed 32 × 32 px square with rounded corners and centered initials on the login page and in the top navigation, including on narrow screens.

Navigation stays at the top while scrolling. Desktop screens show the available navigation links, account profile, and **Wyloguj się** (Log out) in one row. Residents can open their reports or submit a problem; administrators can switch between the dashboard, city correspondence, and AI assistant.

At widths up to 1050 px, use **Menu** to show or hide the links and account controls. The button supports Enter and Space; Escape closes the menu and returns focus to the button. Choosing a section or opening the report form also closes the menu. The logo and Menu button stay visible above the page content.

## Responsive layout

Resident and administrator pages fill the available width below the top navigation, including on ultrawide monitors. Tablet and mobile layouts use smaller page padding and stack panels vertically. Maps automatically resize with the window without changing the zoom level.

To verify, resize the browser to 390, 950, 1440, 2560, and 3840 px. Check the resident dashboard, administrator dashboard, city correspondence, AI assistant, and report details: content should extend to both page paddings, with wide tables scrolling inside their panels. On smaller screens, check the menu with pointer and keyboard, including closing it after navigation. Scroll the page and confirm the top bar stays visible without covering the page heading.

## Categories

The administrator's **Kategorie** panel is read-only: it shows category names and report counts, with no category editing controls. Default names and colors are defined in `DEFAULT_CATEGORIES` in `app.py`. Every startup adds missing names to both new and existing databases, preserving existing category IDs, colors, custom categories, and report assignments. Restart the backend after adding a default, then refresh the page. Editing or removing a definition does not rename or remove an existing category or change its color.

The former **Droga i chodnik** category is migrated into separate **Droga** and **Chodnik** categories. Reports whose titles clearly mention a pavement or sidewalk move to **Chodnik**; the description is checked when the title identifies neither a road nor a sidewalk. Reports mentioning both or neither remain under **Droga**. Existing reports already assigned to either separate category are kept there. Report IDs and other report data are preserved.

| Category | Examples |
| --- | --- |
| Droga | Potholes, damaged road surfaces |
| Chodnik | Uneven paving slabs, damaged pavements |
| Oświetlenie | Broken streetlights |
| Czystość | Litter, overflowing bins, illegal dumping |
| Zieleń | Damaged trees, neglected green areas |
| Oznakowanie i sygnalizacja | Damaged signs, faulty traffic lights |
| Parkowanie | Blocked pavements, damaged parking facilities |
| Transport publiczny | Damaged stops, shelters, timetable boards |
| Infrastruktura rowerowa | Damaged cycle paths and bicycle racks |
| Mała architektura | Broken benches, bollards, public fixtures |
| Place zabaw i rekreacja | Damaged playground and outdoor exercise equipment |
| Inne | Problems outside the listed categories |

The administrator-only `POST /api/categories` endpoint remains available with a `name` and optional `color`; its permissions and behavior are unchanged.

## Administrator report sorting

In **Panel obsługi**, use **Sortuj według** above **Wszystkie zgłoszenia** to sort by date (newest or oldest first), priority (highest or lowest first), status (New to Resolved or the reverse), title, or category (A–Z or Z–A, using Polish alphabetical order). Reports with equal sort values are ordered by descending report ID. The default is newest first.

The selected order stays active when navigating within the app or saving status and priority changes; changed reports move to their new position. Refreshing the page resets sorting to newest first.

## Report locations and maps

The **Nowe zgłoszenie** (New report) dialog is up to 800 px wide and fits smaller screens with space around its edges.

In the report form, enter a street and city, click **Szukaj** (Search), and choose an address if several matches appear. You can also click the map or use **Użyj mojej lokalizacji (GPS)**. GPS requires browser permission and HTTPS or localhost. A selected point can be saved even if no nearby address is available. The form shows the nearest address while preserving the exact coordinates you selected.

In report details, **Otwórz lokalizację na mapie** opens an interactive map inside CityReport. Close it with the close button or Esc to return to the report.

The administrator map includes reports from all residents. Pins show report status; a numbered pin groups reports at identical coordinates. Nearby points with different coordinates remain separate pins. Click a pin to open its report list, or **Pokaż wszystkie** to fit all reports. Reports without coordinates are listed below the map. Saved priorities appear in report popups.

The dashboard map grows with window height: 65% of the viewport height on desktop (420–900 px), and 60% on screens up to 650 px wide (360–520 px). Resize the window vertically to check the height adjustment; map controls and markers remain usable after resizing or opening the navigation menu.

Map tiles come from OpenStreetMap. The backend sends address searches and selected points to Photon. Set `CITYREPORT_PHOTON_URL` to use your own Photon instance.

## Saved report priorities

Every new and existing report has a saved priority: **Krytyczny** (Critical), **Wysoki** (High), **Średni** (Medium), or **Niski** (Low). API values are `critical`, `high`, `medium`, and `low`; the default is Medium.

Priorities are visible only to administrators, who can change them in the administration table or report details. Administrator report cards, map popups, and city cases also show priorities. Resident report cards and details show repair status without priority information; resident API responses omit priority fields.

To use AI, open **Asystent AI**, select **Zaproponuj priorytety**, and review the proposed levels and reasons. Each suggestion has an approval checkbox. Leave checked only the reports you agree with, then click **Zapisz wybrane** (Save selected). For example, approve reports 1 and 3 while leaving report 2 unchanged. **Zapisz wszystkie** (Save all) applies all remaining suggestions regardless of the checkboxes. Select-all and clear-all controls make longer analyses easier to review; all suggestions are initially selected.

Analysis covers all unresolved reports by default. To analyse one report, use **Zaproponuj priorytet przez AI** in its details, or type a request such as “Suggest a priority for report #17”. Explicitly selected reports may also be resolved. Questions such as “What priority does report #17 have?” read the current state without saving changes.

Analysis alone does not modify reports. Each save applies only the selected suggestions, in one transaction; unchecked reports are not changed or validated as part of that save. Saved suggestions are marked and locked. You can approve the remaining suggestions later, within the proposal's original 30-minute lifetime. Only the administrator who generated the proposal can approve it. If a selected report changed after analysis, that save is rejected as a whole without partial updates; previously approved suggestions stay saved. Changes to unchecked reports do not block approval of other reports. Retrying an approved suggestion never overwrites later manual changes. Invalid, incomplete, or unavailable AI responses never change priorities.

Saved priorities survive refreshes and application restarts. Administrators can see whether a priority is default, manual, or saved from AI, including the AI reason. Manual changes replace the previous AI reason. All changes are audited. Saving a priority does not change repair status.

## City communication: local demo

Administrators have a **Kontakt z miastem** view. Select **Nowa sprawa**, choose a resident report and city service, and write the first message. The **Kontakt ze służbami miejskimi** button in report details opens the same workflow. Each report has one city case; opening the shortcut again returns to its history.

Save follow-up messages or manually record an **Odpowiedź służb (demo)**. Cases can be reassigned to another service and moved between **Otwarta**, **W realizacji**, and **Zakończona**. These stages synchronize in both directions with report statuses **Nowe**, **W toku**, and **Rozwiązane**. The list supports search and stage filters, and correspondence survives refreshes.

This is a local demonstration: messages are not delivered to a city office, and replies do not come from an external service. Only administrators can access the view or `/api/city/` endpoints. Message authors, service history, and repair-stage changes are recorded. Deleting a report also removes its city case and messages.

## AI chatbot test reports

To add a repeatable set of 150 fictional reports to the existing database:

```powershell
python dev.py seed-chat-reports
```

The set covers all 12 configured default categories, with 70 New, 40 In progress, and 40 Resolved reports. It contains 30 groups of four related reports plus 30 distinct issues in the same categories, so similarity checks cannot rely on category alone. Descriptions include urgent hazards, routine maintenance, and minor cosmetic issues. Dates span roughly three months; Kraków addresses and map positions are illustrative, not claims about real incidents. Reports have no photos and start with the default Medium priority so you can review the AI's own suggestions.

Titles carry markers **[TEST AI 001]** through **[TEST AI 150]**. The first existing resident account owns the reports. Existing reports, accounts, categories, and city correspondence are preserved. Running the command again adds only missing markers and keeps edits to existing test entries, including saved AI priorities. Dataset definitions are in `chat_report_fixtures.py`; creation is recorded in the audit log.

Refresh the application and open **Asystent AI**. Try **Zaproponuj priorytety**, or questions such as “Podsumuj zgłoszenia według kategorii i statusu”, “Które nierozwiązane zgłoszenia stwarzają zagrożenie dla dzieci?” and “Pokaż podobne nierozwiązane zgłoszenia i zaproponuj priorytety”.

## Development cleanup commands

Run these commands from the project directory:

| Action | Command |
| --- | --- |
| Delete report 7 and its photo | `python dev.py delete-report 7` |
| Delete all reports and their photos | `python dev.py delete-all-reports` |
| Delete audit entry 12 | `python dev.py delete-log-entry 12` |
| Clear the audit log | `python dev.py clear-log` |

Replace IDs with numbers shown in the application. Report deletion is audited and preserves accounts and categories. Audit cleanup permanently removes the selected log entries. Refresh the page after running a command.

## Sign-in

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Resident | [jan@cityreport.local](mailto:jan@cityreport.local) | CityReport123! |
| Administrator | [anna@cityreport.local](mailto:anna@cityreport.local) | CityReportAdmin123! |

The login page includes buttons that fill these demo credentials. Residents see their own reports; administrators can access all reports, city communication, and AI. **Wyloguj się** ends the session. Sessions expire after 12 hours.

Passwords use PBKDF2 hashes and sessions use HttpOnly cookies. Before the first initialization of demo passwords, you can set `CITYREPORT_RESIDENT_PASSWORD` and `CITYREPORT_ADMIN_PASSWORD`. Changing those variables later does not overwrite saved passwords. The login hints describe the default demo passwords.

## Local AI configuration

The backend uses an OpenAI-compatible `/v1/chat/completions` server. Defaults are LM Studio at `http://127.0.0.1:1234/v1`, the `qwen2.5-vl-7b-instruct` model for photos, and `openai/gpt-oss-20b` for administrator chat and priority analysis.

Example configuration for Ollama photo analysis:

```powershell
$env:LOCAL_LLM_BASE_URL = "http://127.0.0.1:11434/v1"
$env:LOCAL_LLM_MODEL = "llama3.2-vision"
python app.py
```

Configure chat independently:

```powershell
$env:LOCAL_CHAT_LLM_BASE_URL = "http://127.0.0.1:1234/v1"
$env:LOCAL_CHAT_LLM_MODEL = "openai/gpt-oss-20b"
python app.py
```

`LOCAL_LLM_BASE_URL` and `LOCAL_LLM_MODEL` configure photo analysis. If `LOCAL_CHAT_LLM_BASE_URL` is unset, chat uses the photo server URL with its own chat model. For Ollama chat, also set `LOCAL_CHAT_LLM_MODEL` to an installed text model. Use model identifiers available on your server and restart the application after changing variables.

The application passes the model ID with each request and waits up to 180 seconds. Model loading and switching are handled by the local server; LM Studio's [JIT loading and Auto-Evict](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) support automatic switching. Start the server and make both models available before using AI features.

If the server requires authentication, set `LOCAL_LLM_API_KEY`. It is sent only by the backend in the `Authorization` header and is not exposed to the browser.

## Administrator AI assistant

Open **Asystent AI** while signed in as an administrator. Unauthenticated chat requests return 401; resident requests return 403.

Each question receives a fresh database snapshot containing report IDs, titles, descriptions, addresses, coordinates, categories, saved priorities, statuses, and dates. Photos, password hashes, and sessions are excluded. The model receives the last six conversation exchanges; the current snapshot takes precedence over older discussion. Single-report priority analysis receives only the selected report.

Ask about reports, request summaries, or ask which issues should be handled first. **Nowa rozmowa** resets browser conversation history. Refreshing clears conversation history but keeps saved priorities. The full report descriptions must fit the selected model's context window; reports are not silently omitted. Data goes to the configured chat server, which is local by default.

### Structured priority and similarity analysis

**Zaproponuj priorytety** uses `/api/ai/chat` with `mode: "prioritize"` and [JSON Schema structured output](https://lmstudio.ai/docs/developer/openai-compat/structured-output). The response contains a `summary` and a `reports` array with `id`, `priority`, and a short Polish `reason`. The backend requires one valid result per selected report and rejects incomplete responses, duplicates, unknown IDs, or invalid levels as a whole (HTTP 502).

Results are enriched with database metadata and shown as cards from Critical to Low. Missing metadata has fallback labels, and AI text is rendered as text rather than HTML. Approve a subset with **Zapisz wybrane**, or all remaining suggestions with **Zapisz wszystkie**. The server accepts only report IDs belonging to its validated proposal; selected saves use `/api/ai/priorities/apply-selected`, which requires an explicit, nonempty selection. The older `/api/ai/priorities/apply` endpoint still supports applying all remaining suggestions. If there are no reports to analyse, the model is not called. An analysis without suggestions has no save controls; unchecking every result disables Save selected while Save all remains available.

Requests such as “Show similar reports and assign priorities” automatically select `similar` mode. Other assignment requests select `prioritize`; ordinary explanations and questions remain conversational.

Similarity analysis uses unresolved reports and must be supported by their descriptions. Category alone is insufficient. Descriptions without at least two words of three letters are excluded. Each result includes a priority, mutual `similar_to` references, and `evidence` copied from its own description. The backend verifies IDs, mutual relationships, and quoted evidence. No supported matches produces an empty list. These checks validate evidence origin; administrators still review the model's judgement. Priorities for the returned matching reports can be saved with the same approval button.

Ordinary answers support basic Markdown: tables, emphasis, headings, lists, quotes, code, and links. Wide tables and code can scroll horizontally. Raw HTML remains text, images are not loaded, and links are restricted to HTTP, HTTPS, and email. JSON-wrapped ordinary text from model presets is unwrapped before rendering. Connection, loading, and authentication failures produce readable errors without exposing upstream error bodies or API keys; expired app sessions return to login.

## Verification

Run the tests without a live model:

```powershell
python -m unittest discover -s tests -v
```

Browser checks:

1. Submit a resident report with a location and optional photo. Verify that it opens on the in-app map.
2. Change its priority manually as an administrator and refresh to confirm persistence. Sign in as the resident and verify that report cards and details still show repair status without priority information, and that report API responses omit priority fields.
3. Generate three AI suggestions, approve only the first and third, and verify the second report remains unchanged. Then approve the remaining suggestion or use Save all, and check persistence.
4. Change a selected report after analysis and verify that its save is rejected without partial updates. Change only an unchecked report and verify it does not block saving other suggestions.
5. Check report cards, map popups, AI cards, and the city conversation view at a narrow viewport such as 390 px.
6. Test photo suggestions with the vision model and chat/priority analysis with the chat model.
7. Stop the model server and verify that a failed analysis preserves saved priorities and can be retried.
8. In **Wszystkie zgłoszenia**, check both directions for each sort field. Change a status or priority while sorting by that field and confirm the correct report is updated and moves to its new position. Check the sorting control at 390 px and verify that report links still open the correct details.
9. Open **Zgłoś problem** and check that the category selector includes the configured default categories, with separate **Droga** and **Chodnik** options. Submit a report in each and verify its label in report details and the administrator's read-only category list. Restart the backend and check that categories are not duplicated, the old **Droga i chodnik** option is absent, and migrated reports keep their IDs and content.

Static assets have versioned URLs and require cache revalidation. Restart the backend and refresh the browser after updates.

## Demonstration walkthrough

1. Sign in as a resident and select **Zgłoś problem**.
2. Add a photo and location; write a description or request an editable AI suggestion.
3. Submit the report and inspect its saved status.
4. Sign in as an administrator, update repair status and priority, and inspect the audit log.
5. Review and save AI priority proposals, then refresh to confirm persistence.
6. Create a local city case and record a demo reply or repair update.

The application provides separate resident and administrator views, REST endpoints, a relational SQLite database, location maps, local city-service correspondence, saved priorities, and backend AI for photo descriptions and administrator analysis.
