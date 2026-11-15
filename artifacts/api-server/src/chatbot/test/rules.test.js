import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOption, planEvent, classroomDeadline, toMs, nowPacific } from '../src/rules.js';
import { recommendRooms, normalizeRooms } from '../src/rooms.js';
import { readFileSync } from 'node:fs';

// Recommender tests use the bundled 19-room sample so they don't depend on how many rooms the team file has.
const SAMPLE = normalizeRooms(JSON.parse(readFileSync(new URL('../data/rooms.sample.json', import.meta.url), 'utf8'))).rooms;

const NOW = nowPacific('2026-10-01'); // Thursday, Week 6 of sample Fall 2026
const opt = (date, window_start = '18:00', window_end = '22:00', duration_minutes = 120) => ({ date, window_start, window_end, duration_minutes });
const rules = (r) => r.problems.map((p) => p.rule);

test('Halloween example: Wed Oct 28 6-10pm, 2h is valid with a 48h deadline', () => {
  const r = evaluateOption(opt('2026-10-28'), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.start_time, '18:00');
  assert.equal(r.end_time, '19:50'); // ends 10 min before the hour
  assert.equal(r.classroom_deadline, '2026-10-26T18:00');
});

test('Mon-Thu deadline is 48 hours before start', () => {
  const d = classroomDeadline(toMs('2026-10-20', '19:00')); // Tuesday
  assert.equal(new Date(d.ms).toISOString().slice(0, 16), '2026-10-18T19:00');
  assert.equal(d.rule, 'R04');
});

test('Sat and Sun use Thursday 12:00 PM; Friday uses the earlier 48-hour cutoff', () => {
  for (const day of ['2026-10-24', '2026-10-25']) {
    const d = classroomDeadline(toMs(day, '16:00'));
    assert.equal(new Date(d.ms).toISOString().slice(0, 16), '2026-10-22T12:00', day);
    assert.equal(d.rule, 'R03');
  }
  const fri = classroomDeadline(toMs('2026-10-23', '16:00'));
  assert.equal(new Date(fri.ms).toISOString().slice(0, 16), '2026-10-21T16:00');
});

test('Times snap to the form rules: start :00/:30, end :20/:50, end by 11 PM', () => {
  const r = evaluateOption(opt('2026-10-28', '18:10', '23:45', 270), NOW);
  assert.equal(r.start_time, '18:30');
  assert.equal(r.end_time, '22:50');
  assert.equal(r.ok, true);
});

test('Same-day requests are rejected', () => {
  assert.ok(rules(evaluateOption(opt('2026-10-01'), NOW)).length > 0);
});

test('Tuesday 5pm window start is moved to 6pm', () => {
  const r = evaluateOption(opt('2026-10-27', '17:00', '21:00', 60), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.start_time, '18:00');
  assert.ok(r.notes.some((n) => n.includes('earliest')));
});

test('Tuesday 4-6:30pm window cannot fit a 2h event after 6pm', () => {
  const r = evaluateOption(opt('2026-10-27', '16:00', '18:30', 120), NOW);
  assert.equal(r.ok, false);
  assert.deepEqual(rules(r), ['R06']);
});

test('Friday 3pm start is allowed', () => {
  const r = evaluateOption(opt('2026-10-23', '15:00', '18:00', 120), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.start_time, '15:00');
});

test('Week 3 date is blocked with the Week 4 suggestion', () => {
  const r = evaluateOption(opt('2026-09-08'), nowPacific('2026-08-26'));
  assert.equal(r.ok, false);
  assert.ok(rules(r).includes('R02'));
  assert.match(r.problems[0].suggestion, /2026-09-14/);
});

test('Official fall recess and Veterans Day are blocked', () => {
  assert.ok(rules(evaluateOption(opt('2026-10-08'), NOW)).includes('R05'));
  assert.ok(rules(evaluateOption(opt('2026-11-11'), NOW)).includes('R05'));
});

test('Holiday and finals are blocked', () => {
  assert.ok(rules(evaluateOption(opt('2026-11-25'), NOW)).includes('R05'));
  assert.ok(rules(evaluateOption(opt('2026-12-10'), NOW)).includes('R05'));
});

test('Next-term request before current term ends is blocked (R07)', () => {
  const r = evaluateOption(opt('2027-02-10'), NOW);
  assert.ok(rules(r).includes('R07'));
});

test('Deadline already passed is blocked', () => {
  const r = evaluateOption(opt('2026-10-03', '15:00', '18:00', 60), toMs('2026-10-01', '12:01')); // Thursday 12:01 PM, event Saturday
  assert.equal(r.ok, false);
  assert.ok(rules(r).includes('R03'));
});

test('Summer date is outside the terms', () => {
  assert.ok(rules(evaluateOption(opt('2027-07-01'), NOW)).includes('R02'));
});

test('Permit triggers follow the classroom form: 25+ or student-government funding', () => {
  const base = { options: [opt('2026-10-28')], has_food: false, funding: 'none' };
  assert.equal(planEvent({ ...base, attendance: 24 }, NOW).permit.required, false);
  assert.equal(planEvent({ ...base, attendance: 25 }, NOW).permit.triggers.length, 1);
  assert.equal(planEvent({ ...base, attendance: 10, funding: 'USG' }, NOW).permit.required, true);
});

test('Halloween plan: candy is flagged because food is not allowed in classrooms', () => {
  const plan = planEvent({
    club_name: 'Open Alpha', attendance: 20, has_food: true, funding: 'none',
    options: [opt('2026-10-28'), opt('2026-10-27'), opt('2026-10-26')],
  }, NOW);
  assert.equal(plan.best_option.date, '2026-10-28');
  assert.equal(plan.classroom_blockers[0].rule, 'R16');
  assert.equal(plan.permit.required, false);
  assert.deepEqual(plan.steps.map((s) => s.id), ['classroom_request']);
  assert.equal(plan.classroom_form_answers.page_4_or_5_times, 'Start 6:00 PM, End 7:50 PM');
  assert.match(plan.required_statements.non_discrimination, /Open Alpha operates/);
});

test('Permit step comes after the classroom confirmation', () => {
  const plan = planEvent({ club_name: 'X', attendance: 40, options: [opt('2026-11-18')] }, NOW);
  const ids = plan.steps.map((s) => s.id);
  assert.ok(ids.indexOf('classroom_request') < ids.indexOf('event_permit'));
  assert.match(plan.steps[0].after, /13-digit/);
});

test('Career and minors add their steps', () => {
  const plan = planEvent({ attendance: 10, career_related: true, minors: true, options: [opt('2026-12-01')] }, NOW);
  assert.deepEqual(plan.steps.map((s) => s.id), ['career_event', 'classroom_request', 'event_permit', 'youth_protection']);
  assert.ok(plan.permit.triggers.some((x) => /Youth Protection/.test(x)));
});

test('Room recommender: fits group, has projector, prefers less-requested rooms', () => {
  const res = recommendRooms({ attendance: 20, needs: ['projector'] }, SAMPLE);
  assert.equal(res.recommended.length, 3);
  for (const r of res.recommended) assert.ok(r.capacity >= 20 && r.equipment.includes('projector'));
  assert.equal(res.recommended[0].popularity_label, 'Low');
  assert.match(res.recommended[0].id, /^demo-/); // ids stay in the heatmap's format
});

test('Room recommender: impossible request returns no_match', () => {
  const res = recommendRooms({ attendance: 500 }, SAMPLE);
  assert.equal(res.recommended.length, 0);
  assert.ok(res.no_match);
});

test('Fundraising adds a permit trigger and a Campus Activities meeting 2 weeks ahead', () => {
  const plan = planEvent({ attendance: 10, fundraising: true, options: [opt('2026-11-04')] }, NOW);
  assert.ok(plan.permit.triggers.some((x) => /Fundraising/.test(x)));
  assert.ok(plan.steps.some((s) => s.id === 'fundraising' && s.due.includes('Oct 21')));
});

test('Permit step lists what to prepare, starting with the 13-digit reservation number', () => {
  const plan = planEvent({ club_name: 'X', attendance: 40, options: [opt('2026-11-18')] }, NOW);
  const permit = plan.steps.find((s) => s.id === 'event_permit');
  assert.match(permit.prepare[0], /13-digit/);
  assert.match(permit.url, /usc-its\.my\.site\.com/);
});

test('Career step lists advisor, leadership and RSVP uploads', () => {
  const plan = planEvent({ club_name: 'X', attendance: 15, career_related: true, options: [opt('2026-11-18')] }, NOW);
  const career = plan.steps.find((s) => s.id === 'career_event');
  assert.ok(career.prepare.some((p) => /advisor/.test(p)));
  assert.ok(career.prepare.some((p) => /RSVP/.test(p)));
});
