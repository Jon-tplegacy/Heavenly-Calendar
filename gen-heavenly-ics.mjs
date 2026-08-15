#!/usr/bin/env node
/**
 * gen-heavenly-ics.mjs — build the subscription feed for the Heavenly Calendar.
 *
 * Reads lunar.json and writes heavenly.ics: the ten Holy Days of Cheon Il Guk
 * plus Ahn Shil Il, for a rolling window of years. Calendar clients that
 * subscribe to the resulting file re-fetch it about once a day, so publishing
 * a new build is all that is needed to update every subscriber.
 *
 *   npm install korean-lunar-calendar
 *   node gen-heavenly-ics.mjs --from 2013 --to 2040 --ahn-from 2024
 *
 * Defaults: --in lunar.json --out heavenly.ics --from 2013 --to <current year + 10>
 *
 *   --ahn-from <year>  start the weekly Ahn Shil Il later than the Holy Days.
 *                      Keeps the file small: past weeks are dead weight in a
 *                      personal calendar, while past Holy Days are anniversaries
 *                      worth keeping.
 *   --notes            include the ~50 secondary providential observances.
 *
 * License: CC BY-SA 4.0, True Parents Legacy (tplegacy.net).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import KoreanLunarCalendar from 'korean-lunar-calendar';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes('--' + name);

const IN_FILE   = arg('in', 'lunar.json');
const OUT_FILE  = arg('out', 'heavenly.ics');
const YEAR_FROM = parseInt(arg('from', '2013'), 10);
const YEAR_TO   = parseInt(arg('to', String(new Date().getFullYear() + 10)), 10);
const WITH_NOTES = flag('notes');

// Ahn Shil Il recurs every 8 days, so it dominates the file size — roughly
// 45 events per year against 10 Holy Days. Historical weeks are of no use in
// a personal calendar, so it can start later than the Holy Days do.
const AHN_FROM = parseInt(arg('ahn-from', String(YEAR_FROM)), 10);

const SITE   = 'https://tplegacy.net/calendar/';
const UID_NS = 'heavenly-calendar.tplegacy.net';

// ---------------------------------------------------------------- data
const data = JSON.parse(readFileSync(IN_FILE, 'utf8'));

// The published lunar.json calls this key `holidays_override_gregorian`.
// The older `holidays` name is accepted too, in case the dataset changes back.
const HOLIDAYS  = data.holidays_override_gregorian || data.holidays || {};
const REC       = Array.isArray(data.recurring_lunar_holidays) ? data.recurring_lunar_holidays : [];
const REC_NOTES = Array.isArray(data.recurring_lunar_notes) ? data.recurring_lunar_notes : [];

const rule = data.ahn_shil_il_rule || {};
const AHN_SEED = rule.seed_gregorian ? new Date(rule.seed_gregorian + 'T00:00:00Z') : null;
const AHN_STEP = parseInt(rule.interval_days, 10) > 0 ? parseInt(rule.interval_days, 10) : 8;

if (!AHN_SEED) console.warn('! No ahn_shil_il_rule.seed_gregorian in ' + IN_FILE + ' — Ahn Shil Il will be skipped.');

// ---------------------------------------------------------------- helpers
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const icsDay = (d) => ymd(d).replace(/-/g, '');

function lunarMD(d) {
  const cal = new KoreanLunarCalendar();
  cal.setSolarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  const l = cal.getLunarCalendar();
  return l ? { m: l.month, d: l.day } : null;
}

function isAhn(d) {
  if (!AHN_SEED) return false;
  const diff = Math.round((d - AHN_SEED) / 86400000);
  return ((diff % AHN_STEP) + AHN_STEP) % AHN_STEP === 0;
}

function matchLunar(list, md) {
  if (!md) return [];
  const key = md.m + '.' + md.d;
  return list.filter((h) => String(h.lunar_md) === key).map((h) => h.name);
}

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 §3.1 — fold at 75 octets without splitting a multi-byte character
function fold(line) {
  const parts = [];
  let cur = '', bytes = 0, limit = 74;
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    const b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + b > limit) { parts.push(cur); cur = ''; bytes = 0; limit = 73; }
    cur += ch; bytes += b;
  }
  parts.push(cur);
  return parts.length === 1 ? parts[0] : parts[0] + '\r\n ' + parts.slice(1).join('\r\n ');
}

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// ---------------------------------------------------------------- collect
const events = [];
const cursor = new Date(Date.UTC(YEAR_FROM, 0, 1));
const end = new Date(Date.UTC(YEAR_TO, 11, 31));

let duplicates = 0;

while (cursor <= end) {
  const iso = ymd(cursor);
  const md = lunarMD(cursor);

  // A Gregorian override and the lunar rule can land the same holiday on the
  // same day (e.g. 2025-11-20 True Children's Day). Emitting it twice would
  // produce two VEVENTs sharing one UID, which breaks strict clients.
  const seen = new Set();
  const add = (type, name) => {
    const key = type + '|' + name;
    if (seen.has(key)) { duplicates++; return; }
    seen.add(key);
    events.push({ date: new Date(cursor), iso, md, type, name });
  };

  if (HOLIDAYS[iso]) add('holy', HOLIDAYS[iso]);
  for (const name of matchLunar(REC, md)) add('holy', name);
  if (cursor.getUTCFullYear() >= AHN_FROM && isAhn(cursor)) add('ahn', 'Ahn Shil Il');
  if (WITH_NOTES) for (const name of matchLunar(REC_NOTES, md)) add('note', name);

  cursor.setUTCDate(cursor.getUTCDate() + 1);
}

if (duplicates) console.log('  (collapsed ' + duplicates + ' duplicate entr' + (duplicates === 1 ? 'y' : 'ies') + ')');

// ---------------------------------------------------------------- build
// DTSTAMP is pinned to the start of the build day so that rebuilding without
// data changes produces a byte-identical file and git stays quiet.
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'T000000Z';

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//True Parents Legacy//Heavenly Calendar//EN',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:Heavenly Calendar',
  'X-WR-CALDESC:Holy Days and Ahn Shil Il of Cheon Il Guk. CC BY-SA 4.0 - tplegacy.net',
  'SOURCE;VALUE=URI:https://jon-tplegacy.github.io/Heavenly-Calendar/heavenly.ics',
  // The dataset changes at most once a year, so asking clients to re-fetch
  // monthly is enough — and it keeps traffic off GitHub Pages.
  'X-PUBLISHED-TTL:P30D',
  'REFRESH-INTERVAL;VALUE=DURATION:P30D'
];

for (const e of events) {
  const endDate = new Date(e.date);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const label =
    e.type === 'ahn'  ? 'Weekly day of rest (Ahn Shil Il)' :
    e.type === 'holy' ? 'Holy Day of Cheon Il Guk' :
                        'Providential observance';

  lines.push(
    'BEGIN:VEVENT',
    'UID:' + e.iso + '-' + slugify(e.name) + '@' + UID_NS,
    'DTSTAMP:' + stamp,
    'DTSTART;VALUE=DATE:' + icsDay(e.date),
    'DTEND;VALUE=DATE:' + icsDay(endDate),
    'SUMMARY:' + icsEscape(e.name),
    'DESCRIPTION:' + icsEscape(label + (e.md ? ' \u00b7 Heavenly date ' + e.md.m + '.' + e.md.d : '') + '\n' + SITE),
    'CATEGORIES:' + (e.type === 'ahn' ? 'Ahn Shil Il' : e.type === 'holy' ? 'Holy Day' : 'Observance'),
    'URL:' + SITE,
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'END:VEVENT'
  );
}

lines.push('END:VCALENDAR');

const ics = lines.map(fold).join('\r\n') + '\r\n';
writeFileSync(OUT_FILE, ics, 'utf8');

const counts = events.reduce((acc, e) => ((acc[e.type] = (acc[e.type] || 0) + 1), acc), {});
console.log(
  'Wrote ' + OUT_FILE + ' — ' + events.length + ' events, ' + YEAR_FROM + '–' + YEAR_TO +
  ' (' + Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ') + ')'
);
