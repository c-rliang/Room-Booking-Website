// Deterministic rules engine for USC RSO classroom requests.
// The AI never decides a deadline or requirement: it only calls these functions.
// All times are Pacific wall-clock times, stored as "fake UTC" milliseconds so
// that no server timezone setting can shift a deadline.

import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const CALENDAR = load('../data/term_calendar.json');
export const FORMS = load('../data/forms.json');

const HOUR = 36e5;
const DAY = 24 * HOUR;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------- time helpers ----------
export function toMs(date, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm);
}
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const isoTime = (ms) => new Date(ms).toISOString().slice(11, 16);
const weekday = (ms) => new Date(ms).getUTCDay();

export function pretty(ms) {
  const d = new Date(ms);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  const t = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}, ${d.getUTCFullYear()} at ${t}`;
}

/** Current Pacific wall-clock time. `demoToday` (YYYY-MM-DD) pins "now" to 9:00 AM that day for demos. */
export function nowPacific(demoToday) {
  if (demoToday) return toMs(demoToday, '09:00');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
}

// ---------- calendar helpers ----------
export const termFor = (date) => CALENDAR.terms.find((t) => date >= t.first_day && date <= t.finals_end) || null;
const nextTermAfter = (date) => CALENDAR.terms.find((t) => t.first_day > date) || null;
const weekOfTerm = (term, date) => Math.floor((toMs(date) - toMs(term.first_day)) / (7 * DAY)) + 1;
const blackoutFor = (term, date) => term.blackouts.find((b) => date >= b.start && date <= b.end) || null;

/** Earliest allowed start (HH:MM) for a weekday, or null when no rule is published (weekends). */
export function earliestStart(dow) {
  if (dow >= 1 && dow <= 4) return '18:00'; // Mon-Thu
  if (dow === 5) return '15:00'; // Fri
  return null;
}

/**
 * Classroom request deadline (form: "Requests submitted within 48 hours of the event will not be
 * accepted" and "Friday through Sunday ... must be submitted by 12:00 PM on the Thursday before").
 * For Fri–Sun the earlier of the two applies.
 */
export function classroomDeadline(startMs) {
  const dow = weekday(startMs);
  const minus48 = startMs - 48 * HOUR;
  if (dow >= 1 && dow <= 4) {
    return { ms: minus48, rule: 'R04', text: 'Requests submitted within 48 hours of the event are not accepted.' };
  }
  const back = { 5: 1, 6: 2, 0: 3 }[dow]; // days back to the Thursday before
  const thursdayNoon = toMs(isoDate(startMs)) - back * DAY + 12 * HOUR;
  return thursdayNoon <= minus48
    ? { ms: thursdayNoon, rule: 'R03', text: 'Friday–Sunday requests must be in by 12:00 PM on the Thursday before.' }
    : { ms: minus48, rule: 'R04', text: 'Requests submitted within 48 hours of the event are not accepted (this is earlier than the Thursday-noon cutoff here).' };
}

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** Form: start on the hour or half hour. */
export const roundStartUp = (min) => Math.ceil(min / 30) * 30;
/** Form: end 10 minutes before the hour or half hour (:20 or :50). */
export const roundEndDown = (min) => Math.floor((min - 20) / 30) * 30 + 20;
const LATEST_END = 23 * 60; // "All reservations must end by 11:00pm."
const fmtTime = (hhmm) => pretty(toMs('2026-01-01', hhmm)).split(' at ')[1];

// ---------- option evaluation ----------
/**
 * Checks one candidate date + time window.
 * option = { date, window_start, window_end, duration_minutes }
 */
export function evaluateOption(option, now) {
  const { date, window_start = '18:00', window_end = '22:00', duration_minutes = 60 } = option;
  const dow = weekday(toMs(date));
  const result = { date, weekday: WEEKDAYS[dow], ok: true, problems: [], notes: [] };
  const block = (rule, message, suggestion) => {
    result.ok = false;
    result.problems.push({ rule, message, ...(suggestion ? { suggestion } : {}) });
  };

  const todayStr = isoDate(now);
  if (date < todayStr) block('DATE', 'This date is already in the past.');
  if (date === todayStr) block('R04', 'Same-day requests are not accepted.');

  const term = termFor(date);
  if (!term) {
    const next = nextTermAfter(date);
    block('R02', 'Classrooms are only scheduled for student organizations during the fall and spring terms.',
      next ? `The next schedulable dates start Monday of Week 4: ${next.week4_start}.` : undefined);
    return result;
  }
  result.term = term.name;
  const week = weekOfTerm(term, date);
  result.week_of_term = week;

  if (date < term.week4_start) {
    block('R02', `This date is in Week ${week}. No classrooms are scheduled for student organizations during the add/drop period (first 3 weeks); reservations begin the Monday of Week 4.`,
      `The first schedulable date this term is ${term.week4_start}.`);
  }
  if (date > term.last_instructional_day) {
    block('R05', 'Requests are only scheduled through the last instructional day; no requests during Study Days and Final Exams.');
  }
  const blackout = blackoutFor(term, date);
  if (blackout && date <= term.last_instructional_day) block('R05', `No student events on this date: ${blackout.name}.`);

  // R07: requests for a future term open only after the current term ends.
  const currentTerm = termFor(todayStr);
  if (currentTerm && currentTerm.id !== term.id && todayStr <= currentTerm.last_instructional_day) {
    block('R07', `Requests for ${term.name} are not accepted yet. Submit a separate request after the last instructional day of ${currentTerm.name} (${currentTerm.last_instructional_day}), once the form reopens.`);
  }

  // R06: start/end times (earliest start, :00/:30 starts, :20/:50 ends, end by 11 PM).
  const earliest = earliestStart(dow);
  let startMin = roundStartUp(toMin(window_start));
  if (earliest && startMin < toMin(earliest)) startMin = toMin(earliest);
  const wantedEnd = Math.min(startMin + duration_minutes, toMin(window_end), LATEST_END);
  const endMin = roundEndDown(wantedEnd);
  const start = fromMin(startMin);
  if (endMin <= startMin || endMin - startMin < duration_minutes - 30) {
    block('R06', `A ${duration_minutes}-minute event does not fit between ${fmtTime(start)} and ${fmtTime(window_end)}${earliest ? ` (on ${WEEKDAYS[dow]}s student events can start no earlier than ${fmtTime(earliest)})` : ''}. Reservations must end by 11:00 PM, 10 minutes before the hour or half hour.`,
      earliest ? `Choose a window that starts at ${fmtTime(earliest)} or later and is long enough.` : undefined);
  } else {
    if (start !== window_start) result.notes.push(`Start set to ${fmtTime(start)}: ${earliest && startMin === toMin(earliest) ? `the earliest allowed start on ${WEEKDAYS[dow]}s` : 'requests must start on the hour or half hour'}.`);
    if (endMin < startMin + duration_minutes) result.notes.push(`End set to ${fmtTime(fromMin(endMin))}: requests must end 10 minutes before the hour or half hour${wantedEnd === LATEST_END ? ', and by 11:00 PM' : ''}.`);
  }
  if (dow === 5) result.notes.push('Friday 3:00 PM starts are allowed only if there is room availability.');
  if (!earliest) result.notes.push('The form shows no earliest start time for Saturday or Sunday; confirm on the weekend page of the form.');
  result.start_time = start;
  result.end_time = fromMin(Math.max(endMin, startMin));
  result.form_weekday_or_weekend = dow === 0 || dow === 6 ? 'Weekend (Saturday or Sunday)' : 'Weekday (Monday–Friday)';

  // R03/R04: hard deadline, plus the form's "at least two weeks in advance" request.
  const startMs = toMs(date, start);
  const deadline = classroomDeadline(startMs);
  result.classroom_deadline = isoDate(deadline.ms) + 'T' + isoTime(deadline.ms);
  result.classroom_deadline_pretty = pretty(deadline.ms);
  result.deadline_rule = deadline.rule;
  result.hours_until_deadline = Math.round((deadline.ms - now) / HOUR);
  const recommended = toMs(date, '17:00') - 14 * DAY;
  result.recommended_submit_by = pretty(recommended);
  result.recommended_passed = recommended < now;
  if (deadline.ms <= now) block(deadline.rule, `The classroom request deadline has passed (${pretty(deadline.ms)}). ${deadline.text}`);
  else if (startMs - now < 7 * DAY) result.notes.push('Requests submitted within one week of the event may not be processed in time, and requests cannot be expedited.');

  return result;
}

// ---------- form helpers ----------
const fmtUS = (iso) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

function requiredStatements(club) {
  const name = club || '[FULL ORGANIZATION NAME]';
  return {
    non_discrimination: `This program is open to all eligible individuals. ${name} operates all of its programs and activities consistent with the University's Notice of Non-Discrimination. Eligibility is not determined based on race, sex, ethnicity, sexual orientation, or any other prohibited factor.`,
    accessibility: `Individuals with disabilities who need accommodations to attend this event may contact ${name} at [CONTACT EMAIL]. We request that individuals requiring accommodations or auxiliary aids such as sign language interpreters and alternative format materials notify us at least 7 days prior to the event. Every reasonable effort will be made to provide reasonable accommodations in an effective and timely manner.`,
  };
}

function classroomFormAnswers(event, best) {
  return {
    page_2_organization_name: `${event.club_name || '[name]'}: type it exactly as on EngageSC, fully spelled out (no acronyms).`,
    page_2_contact: 'Your name, cell phone, USC email, and your initials (certifies you are an officer and responsible for the room).',
    page_3_event_name: event.event_name || event.event_purpose || '',
    page_3_event_description: event.event_purpose || '',
    page_3_event_type: event.event_type || 'Meeting',
    page_3_expected_attendance: Number(event.attendance) || null,
    page_3_weekday_or_weekend: best ? best.form_weekday_or_weekend : null,
    page_3_initials: 'Your initials (agrees that no classrooms are scheduled during add/drop; reservations start Monday of Week 4).',
    page_4_or_5_dates: best ? `Single Date: ${fmtUS(best.date)}` : null,
    page_4_or_5_times: best ? `Start ${fmtTime(best.start_time)}, End ${fmtTime(best.end_time)}` : null,
    page_6_or_7_location: 'One room. Pick a first choice from the building list (an alternate is assigned if it is taken). Check AV in the Room Finder.',
    page_8_expected_audience: event.audience || 'USC Students',
    page_8_amplified_sound: event.amplified_sound ? 'Yes' : 'No',
    page_8_25_or_more: Number(event.attendance) >= 25 ? 'Yes' : 'No',
    page_8_student_government_funded: ['USG', 'GSG'].includes(event.funding) ? 'Yes' : 'No',
    page_8_agreements: 'Check both boxes: the non-discrimination/accessibility statement, and USC policies including NO food or beverages.',
  };
}

// ---------- full plan ----------
/**
 * event = { club_name, event_name, event_purpose, event_type, attendance, has_food, funding ('USG'|'GSG'|'none'),
 *           amplified_sound, filming, fundraising, cosponsored, political_guest, audience,
 *           career_related, needs_dps, health_activities, minors, options: [...] }
 */
export function planEvent(event, now) {
  const options = (event.options || []).map((o) => evaluateOption(o, now));
  const best = options.find((o) => o.ok) || null;
  const steps = [];
  const blockers = [];
  const warnings = [];

  // Hard conflicts with using a classroom at all.
  if (event.has_food) {
    blockers.push({
      rule: 'R16',
      message: 'Food and beverages are not permitted in classrooms. Submitting the classroom form means agreeing not to serve any food or drinks.',
      options: ['Drop the food (then the classroom plan below works).', `Book a non-classroom venue through Trojan Event Services instead (${FORMS.trojan_events.url}).`],
    });
  }

  // Permit triggers, as listed on the Classroom Space Request Form.
  const triggers = [];
  if (Number(event.attendance) >= 25) triggers.push('Expected attendance of 25 or more people');
  if (['USG', 'GSG'].includes(event.funding)) triggers.push(`Partially or fully funded by student government (${event.funding})`);
  if (event.needs_dps) triggers.push('Needs the Department of Public Safety (e.g. dignitaries or high-profile guests)');
  if (event.health_activities) triggers.push('Healthcare activities');
  if (event.minors) triggers.push('Needs other approvals: Youth Protection (minors attending)');
  if (event.fundraising) triggers.push('Fundraising (Campus Activities requires a permit for any fundraising)');

  if (event.career_related) {
    steps.push({ id: 'career_event', title: FORMS.career_event.title, url: FORMS.career_event.url, due: 'About 1 week ahead, if possible. Rooms only during business hours (Mon–Fri 8:30 AM–5:00 PM)', rule: 'R10',
      after: 'Daytime career events go to the Career Center. Evening career events in a classroom use the classroom form below.',
      prepare: [
        `Read the Trojan Accountability Expectations first (${FORMS.trojan_accountability.url}); you must attest to them`,
        'RSO name and a short description of the RSO',
        'Your full name, cell phone and USC email',
        'Room you want, date(s) and time (e.g. 2:00 p.m. - 4:00 p.m.)',
        'Full names and emails of your RSO staff advisor',
        'Full names and emails of your executive leadership team',
        'Meeting description and expected attendance (they will not exceed the room capacity)',
        'Employer name, and names and emails of the employer contacts attending (or N/A)',
        'Whether you will serve food or beverages, and whether another RSO co-sponsors',
        'Files to upload: RSVP list of students attending, and RSVP list of executive members attending',
      ] });
  }

  const permitNeeded = triggers.length > 0;
  steps.push({
    id: 'classroom_request', title: FORMS.classroom_request.title, url: FORMS.classroom_request.url,
    due: best ? `Hard deadline ${best.classroom_deadline_pretty}. The form asks for at least 2 weeks' notice: submit by ${best.recommended_submit_by}${best.recommended_passed ? ' (already passed: submit now)' : ''}.` : 'No valid date yet: fix the problems listed for each date',
    due_iso: best ? best.classroom_deadline : null, rule: best ? best.deadline_rule : null,
    after: permitNeeded ? 'Wait for the email confirmation with your 13-digit reservation number. You need it before you can apply for the event permit.' : 'Reservations are only confirmed once you get the email confirmation with a 13-digit reservation number.',
    tip: 'Requests are first-come, first-served. Spell out your organization name exactly as on EngageSC.',
  });

  let permit = { required: permitNeeded, triggers };
  if (permitNeeded) {
    const rec = best ? toMs(best.date, '17:00') - 21 * DAY : null;
    permit = {
      ...permit,
      recommended_by: rec ? pretty(rec) : null,
      recommended_by_passed: rec ? rec < now : null,
      order_note: 'You MUST have the classroom reservation confirmation (13-digit number) BEFORE applying for the permit. USC’s event-planning guide asks for the permit at least 3 weeks before the event, so submit the classroom request early (4+ weeks ahead is safest).',
    };
    steps.push({
      id: 'event_permit', title: FORMS.event_permit.title, url: FORMS.event_permit.url,
      due: permit.recommended_by ? `After your classroom confirmation; recommended by ${permit.recommended_by}${permit.recommended_by_passed ? ' (already passed: apply as soon as you have the confirmation)' : ''}` : 'After your classroom confirmation, at least 3 weeks before the event',
      rule: 'R08/R09', after: FORMS.event_permit.note,
      prepare: [
        'Venue reservation number: your 13-digit classroom confirmation number',
        'Venue owner/manager name and email: the Classroom Scheduling contact from your confirmation (classroom.scheduling@usc.edu)',
        'Gathering type (an "event" is 25+ people), on or off campus, in-person or virtual',
        'Your name, USC email and mobile number',
        'Day-of onsite contact name and mobile number (a secondary contact is optional)',
        'Type of primary organizer (your RSO), whether the event is co-organized or co-sponsored, and whether any non-USC organization sponsors or funds it',
      ],
    });
  }
  if (event.fundraising) {
    steps.push({ id: 'fundraising', title: 'Fundraising Approval Request Form + meeting with Campus Activities', url: FORMS.tes_forms.url, due: best ? `Meet at least 2 weeks before: ${pretty(toMs(best.date, '17:00') - 14 * DAY)}` : 'At least 2 weeks before the event', rule: 'R15' });
  }
  if (event.filming) steps.push({ id: 'filming', title: 'Filming Approval Request Form', url: FORMS.tes_forms.url, due: 'Before the event', rule: 'R17' });
  if (event.cosponsored) steps.push({ id: 'cosponsorship', title: 'Review the co-sponsorship rules (Student Handbook p. 11, Q)', url: FORMS.rso_resources.url, due: 'Before submitting', rule: 'R18' });
  if (event.political_guest) steps.push({ id: 'political', title: 'Contact University Relations (universityrelations@usc.edu) and review the Political Site Visit and Events Policy', url: FORMS.political_policy.url, due: 'Early in planning', rule: 'R19' });
  if (event.minors && best) {
    const yp = toMs(best.date, '17:00') - 60 * DAY;
    steps.push({ id: 'youth_protection', title: 'Register with the Office of Youth Protection', url: FORMS.tes_faq.url, due: `60 days before: ${pretty(yp)}${yp < now ? ' (already passed)' : ''}`, rule: 'R12' });
  }

  if (event.amplified_sound) warnings.push('Amplified sound is only accommodated if a room without classes nearby is available.');
  warnings.push(
    'Eligibility: your RSO must have an approved 2026–27 recognition, and only officers listed on EngageSC can submit.',
    'Rooms are set up as is: furniture cannot be added or removed, and must be returned to its original layout.',
    'A request is not a reservation. Your preferred room may not be available (an alternate is assigned), and USC can move your event if an academic class needs the room. Requests are typically scheduled 3–5 business days before the event.',
    'Changes: reply to your confirmation email or email classroom.scheduling@usc.edu with the 13-digit reservation number (no phone changes).',
  );

  return {
    today: pretty(now),
    best_option: best ? { date: best.date, weekday: best.weekday, start_time: best.start_time, end_time: best.end_time, form_weekday_or_weekend: best.form_weekday_or_weekend } : null,
    options,
    classroom_blockers: blockers,
    steps,
    permit,
    warnings,
    required_statements: requiredStatements(event.club_name),
    classroom_form_answers: classroomFormAnswers(event, best),
    permit_definitions: 'Event = a scheduled gathering of 25 or more people. Meetings where food is served to 25+ people need a permit; meetings with no food, or only simple snacks (donuts, coffee, cookies), do not, unless they meet other criteria. Note: classrooms allow no food or drinks at all.',
    help: 'Not sure about the permit? Email stuacts@usc.edu or visit RSO Office Hours (Campus Activities website).',
    sources: [FORMS.classroom_request.url, FORMS.event_planning_guide.url, 'https://arr.usc.edu/classroom-scheduling/'],
    data_note: 'Term dates follow the official USC academic calendar; form reopening dates are estimates.',
  };
}
