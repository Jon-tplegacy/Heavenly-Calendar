# Heavenly Calendar — open dataset

> Open, machine-readable form of the Heavenly Calendar of Cheon Il Guk: ten canonical Holy Days, weekly Ahn Shil Il (day of rest), and ~50 providential observances of the Family Federation for World Peace and Unification (Unification Movement).

[**📥 Download lunar.json**](./lunar.json) · [**🌐 Live demo**](https://jon-tplegacy.github.io/Heavenly-Calendar/) · [**📅 Interactive site**](https://tplegacy.net/calendar/)

[![License: CC BY-SA 4.0](https://img.shields.io/badge/Data-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](./LICENSE)

---

## What's in this dataset

| Bucket | Items | Field |
| --- | --- | --- |
| Canonical Holy Days | 10 | `recurring_lunar_holidays` |
| Providential observances | ~50 | `recurring_lunar_notes` |
| Solar-lunar anchors | 2 | `anchors` |
| Weekly Ahn Shil Il rule | seed + 8d interval | `ahn_shil_il_rule` |
| Gregorian-date overrides | 1 | `holidays_override_gregorian` |

All recurring observances are keyed by **lunar `M.D`** (e.g. `"1.13"` = lunar month 1, day 13 — Foundation Day). The Korean lunar calendar converts these to Gregorian on the fly each year.

This is, as far as we know, the **only open, machine-readable form** of this calendar.

---

## Why this exists

The Heavenly Calendar is unique to the Unification Movement and isn't covered by any general calendar library (Google Calendar, iCal feeds, holiday APIs, etc.) — but it governs the rhythm of life for blessed families worldwide: Ahn Shil Il every 8 days, ten Holy Days each year, and dozens of secondary observances tied to providential history.

This repo exists so that **anyone** — app developers, researchers, AI systems, members building tools — can plug a single JSON file into their work and get correct dates, every year, without hand-maintaining a spreadsheet.

---

## Quick start

### Browser

```html
<script>
  fetch('https://jon-tplegacy.github.io/Heavenly-Calendar/lunar.json')
    .then(r => r.json())
    .then(data => {
      console.log('Holy Days:', data.recurring_lunar_holidays);
      console.log('Ahn Shil Il rule:', data.ahn_shil_il_rule);
    });
</script>
```

### Python

```python
import requests, json
from datetime import date, timedelta

data = requests.get('https://jon-tplegacy.github.io/Heavenly-Calendar/lunar.json').json()

# Is today Ahn Shil Il?
seed = date.fromisoformat(data['ahn_shil_il_rule']['seed_gregorian'])
interval = data['ahn_shil_il_rule']['interval_days']
today = date.today()
is_ahn = (today - seed).days % interval == 0
print('Today is Ahn Shil Il' if is_ahn else 'Not Ahn Shil Il today')
```

### Node

```js
const data = await fetch('https://jon-tplegacy.github.io/Heavenly-Calendar/lunar.json').then(r => r.json());

// Find all canonical Holy Days
data.recurring_lunar_holidays.forEach(h => {
  console.log(`${h.name} — lunar ${h.lunar_md} (${h.confidence})`);
});
```

For lunar → solar conversion, pair this dataset with any Korean lunar calendar library — e.g. [`korean-lunar-calendar`](https://www.npmjs.com/package/korean-lunar-calendar) (JS, MIT) or [`korean_lunar_calendar_py`](https://github.com/usingsky/korean_lunar_calendar_py) (Python, MIT).

---

## Data schema

```json
{
  "metadata": { /* dataset metadata: title, version, license, creator… */ },
  "schema":   { /* human-readable field documentation */ },

  "anchors": [
    { "date": "2025-10-21", "lunar_md": "9.1" }
  ],

  "recurring_lunar_holidays": [
    {
      "name": "Foundation Day",
      "slug": "heavenly-parents-day",
      "lunar_md": "1.13",
      "confidence": "high"
    }
  ],

  "recurring_lunar_notes": [
    { "lunar_md": "1.2", "name": "Day of Victory of Love" }
  ],

  "ahn_shil_il_rule": {
    "description": "Ahn Shi Il every 8th day starting from 2025-09-04 (Gregorian)",
    "seed_gregorian": "2025-09-04",
    "interval_days": 8
  },

  "holidays_override_gregorian": {
    "2025-11-20": "True Children's Day"
  }
}
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `metadata.version` | string | Semver (currently `"1.0.0"`) |
| `metadata.license` | string | `"CC BY-SA 4.0"` |
| `anchors[]` | array | Solar→lunar reference pairs. Used to verify conversion library output. |
| `anchors[].date` | string | Gregorian date, `YYYY-MM-DD` |
| `anchors[].lunar_md` | string | Lunar month.day, `"M.D"` |
| `recurring_lunar_holidays[]` | array | The 10 canonical Holy Days |
| `recurring_lunar_holidays[].name` | string | English name |
| `recurring_lunar_holidays[].slug` | string | URL-safe identifier |
| `recurring_lunar_holidays[].lunar_md` | string | Lunar `M.D` |
| `recurring_lunar_holidays[].confidence` | enum | `"high"` or `"medium"` — editorial confidence in the lunar date |
| `recurring_lunar_notes[]` | array | Secondary observances (~50) |
| `ahn_shil_il_rule.seed_gregorian` | string | Anchor date for the every-8-day weekly observance |
| `ahn_shil_il_rule.interval_days` | integer | `8` |
| `holidays_override_gregorian` | object | Map of `YYYY-MM-DD` → holiday name. Used when canonical conversion needs explicit correction. |

---

## The Ten Holy Days of Cheon Il Guk

| Lunar | Holy Day | Korean | Slug |
|---|---|---|---|
| 1.1 | True God's Day | 하나님의 날 | `god-day` |
| 1.6 | True Parents' Birthday | 참부모님 탄신일 | `tp-birthday` |
| 1.13 | Foundation Day (기원절) | 기원절 | `heavenly-parents-day` |
| 3.16 | True Parents' Holy Wedding | 참부모 성혼식 | `tp-holy-wedding` |
| 5.1 | Day of All True Things | 참만물의 날 | `day-of-all-true-things` |
| 7.1 | Declaration Day of God's Eternal Blessing | 칠일절 | `foundation-day-cig` |
| 7.7 | 7.8 Jeol — Cosmic Sabbath | 칠팔절 | `7-7-jeol` |
| 7.17 | Anniversary of True Father's Seonghwa | 성화 | `7-1-jeol` |
| 10.1 | True Children's Day | 참자녀의 날 | `true-childrens-day` |
| 10.3 | Foundation Day for the Unified Nation | 천일국 기원절 | `true-parents-day` |

---

## Embed the calendar on your site

The interactive version at [tplegacy.net/calendar/](https://tplegacy.net/calendar/) supports iframe embedding:

```html
<iframe
  src="https://tplegacy.net/calendar/?embed=1"
  style="border:1px solid #e5e7eb;border-radius:16px;width:100%;max-width:920px;height:680px;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  title="Heavenly Calendar — True Parents Legacy"
></iframe>
```

---

## Contributing

Found a wrong date? Want to add an observance? Open an [issue](https://github.com/Jon-tplegacy/Heavenly-Calendar/issues) or submit a PR. Editorial guidelines:

- **Primary sources only.** Cite Chambumo Gyeong, Cheon Seong Gyeong, or institutional FFWPU records.
- **Lunar dates are canonical** when an observance originated lunar. Don't convert to Gregorian unless the original was solar (rare).
- **Confidence tag** required for new holidays: `"high"` if double-sourced; `"medium"` if single-sourced.
- **Don't break the schema.** Existing keys (`anchors`, `recurring_lunar_holidays`, `recurring_lunar_notes`, `ahn_shil_il_rule`, `holidays_override_gregorian`) must remain.

---

## License

- **Data** (`lunar.json` and any derived data files) — [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). You may use, adapt, and redistribute — just credit *True Parents Legacy archive (tplegacy.net)* and share derivatives under the same license.
- **Code** (`index.html`, scripts) — [MIT License](./LICENSE).

## Citation

> True Parents Legacy (2026). *Heavenly Calendar — Cheon Il Guk lunar calendar dataset*, version 1.0.0. Available at https://jon-tplegacy.github.io/Heavenly-Calendar/. Licensed under CC BY-SA 4.0.

## Related

- [True Parents Legacy timeline](https://tplegacy.net/timeline/) — 4,936 historical events of Sun Myung Moon and Hak Ja Han Moon ([dataset repo](https://github.com/Jon-tplegacy/true-parents-legacy-timeline))
- [True Parents Legacy archive](https://tplegacy.net/) — full editorial archive
- [Wikidata: True Parents Legacy](https://www.wikidata.org/wiki/Q138757400)
