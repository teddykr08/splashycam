import { test } from "node:test";
import assert from "node:assert/strict";
import { ALPHABET, normalizeCode, formatCode, isCompleteCode, stampTime, stampDuration, extractCode } from "../lib/code";

test("alphabet has 32 unambiguous characters", () => {
  assert.equal(ALPHABET.length, 32);
  assert.equal(new Set(ALPHABET).size, 32);
  for (const bad of "ILOU") assert.ok(!ALPHABET.includes(bad));
});

test("normalizeCode forgives case, dashes, spaces and look-alikes", () => {
  assert.equal(normalizeCode("hx7-42k"), "HX742K");
  assert.equal(normalizeCode(" HX7 42K "), "HX742K");
  assert.equal(normalizeCode("o1l-iOk"), "01110K");
});

test("formatCode inserts the dash after 3 characters", () => {
  assert.equal(formatCode("hx742k"), "HX7-42K");
  assert.equal(formatCode("HX"), "HX");
  assert.equal(formatCode("HX7"), "HX7");
  assert.equal(formatCode("HX7-"), "HX7");
  assert.equal(formatCode("HX74"), "HX7-4");
});

test("isCompleteCode needs exactly 6 alphabet characters", () => {
  assert.ok(isCompleteCode("HX7-42K"));
  assert.ok(isCompleteCode("hxo-42k")); // o -> 0
  assert.ok(!isCompleteCode("HX7-42"));
  assert.ok(!isCompleteCode("HX7-42KK"));
  assert.ok(!isCompleteCode("HX7-4UK")); // U isn't in the alphabet
});

test("stampTime is fixed-width 24h local time", () => {
  assert.equal(stampTime(new Date(2026, 0, 5, 7, 3, 9)), "2026-01-05  07:03:09");
  assert.equal(stampTime(new Date(2026, 11, 31, 23, 59, 59)).length, 20);
});

test("stampDuration", () => {
  assert.equal(stampDuration(0), "00:00");
  assert.equal(stampDuration(12_900), "00:12");
  assert.equal(stampDuration(61_000), "01:01");
  assert.equal(stampDuration(-5), "00:00");
});

test("extractCode pulls the code out of a pasted message", () => {
  assert.equal(extractCode("Splashy Cam proof: HX7-42K. Check it in Splashy Cam → Check a code."), "HX7-42K");
  assert.equal(extractCode("hx7-42k"), "HX7-42K");
  assert.equal(extractCode("code is hx742k thanks"), "HX7-42K");
  assert.equal(extractCode("  HXO-42K "), "HX0-42K"); // O -> 0
});

test("extractCode ignores words that only look like codes", () => {
  assert.equal(extractCode("Splashy Cam"), null);       // 'Splash' is inside a longer word
  assert.equal(extractCode("hello there"), null);
  assert.equal(extractCode("ABCDEFG"), null);            // 7 chars
  assert.equal(extractCode("HX7-4UK"), null);            // U isn't valid
  assert.equal(extractCode(""), null);
  assert.equal(extractCode("ok thanks"), null);           // THANKS is valid alphabet-wise
  assert.equal(extractCode("pretty normal clip"), null);  // NORMAL -> N0RMA1 would be too
  assert.equal(extractCode("got it: HXMKQR"), "HXM-KQR"); // all-caps, no digit, still a code
});
