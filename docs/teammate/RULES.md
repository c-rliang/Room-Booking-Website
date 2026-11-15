# Rules the chatbot enforces

Source key: **UEPA** = [USC Events Permit Application](https://usc-its.my.site.com/eventpermits/s/request-submission) (screenshots of pages 1–3),  **CSRF** = Classroom Space Request Form (Wufoo; read from screenshots on 2026-11-14), **ARR** = [Classroom Scheduling page](https://arr.usc.edu/classroom-scheduling/), **CAL** = [USC event planning](https://calendar.usc.edu/event-planning), **AC** = [USC academic calendar](https://www.usc.edu/academic-calendar/), **CA** = [Campus Activities RSO resources](https://campusactivities.usc.edu/programs/recognized-student-organizations/rso-resources/), **CC** = [Career Center form](https://forms.monday.com/forms/c63d99b1d0ee56821d4d4a2faa1b9e89?r=use1).

| ID | Rule | How the chatbot handles it | Source |
| --- | --- | --- | --- |
| R01 | Classroom requests must go through the CSRF; requests sent directly to Classroom Scheduling aren't accepted | Links only to the CSRF | CSRF |
| R02 | No RSO classrooms during add/drop (first 3 weeks); reservations start the Monday of Week 4 | Blocks the date, suggests the first valid date | CSRF, CA |
| R03 | Fri–Sun requests are due by 12:00 PM the Thursday before | Deadline + countdown | CSRF |
| R04 | Requests within 48 hours of the event aren't accepted; no same-day requests | Deadline; for Fri–Sun the earlier of R03 and R04 is used | CSRF |
| R04b | "Please submit all requests at least two weeks in advance"; requests within a week may not be processed in time; no expediting | Recommended submit-by date and a warning | CSRF |
| R05 | No events on university holidays, non-instructional days, official breaks, Study Days or Final Exams | Blocks the date (official term dates) | CSRF, AC |
| R06 | Earliest start 6:00 PM Mon–Thu, 3:00 PM Fri (if rooms are free); start on :00/:30; end at :20/:50; end by 11:00 PM | Adjusts times or blocks the option | CSRF |
| R07 | One term at a time; next term's requests open after the last instructional day, once the form reopens | Blocks next-term dates | CSRF |
| R08 | Event permit required for 25+ attendees, USG/GSG funding, DPS needs, healthcare activities, other approvals (Youth Protection, EH&S), fundraising | Permit step with named triggers | CSRF, CA |
| R09 | Permit only after the 13-digit classroom confirmation; permit at least 3 weeks before the event | Orders the steps, recommended date | CSRF, CAL |
| R10 | Career events: Career Center meeting rooms, business hours only, about 1 week ahead. Needs advisor and leadership names and emails, employer contacts, RSVP list uploads, and attesting to the Trojan Accountability Expectations | Step + checklist of what to prepare | CC |
| R11 | Eligibility: approved 2026–27 recognition; only officers listed on EngageSC; spell out the full name exactly as on EngageSC (no acronyms) | Warning + form answer hint | CSRF, ARR |
| R12 | Events with minors: Youth Protection registration 60 days ahead | Step + deadline | TES FAQ |
| R14 | A request isn't a reservation; first-come, first-served; alternates assigned; events can be moved for academic classes; typically scheduled 3–5 business days before | Warnings | CSRF |
| R15 | Fundraising: Fundraising Approval Request Form + Campus Activities meeting 2 weeks ahead | Step | CSRF, CA |
| R16 | **No food or beverages in classrooms** | Flags the plan, suggests dropping food or using a Trojan Event Services venue | CSRF |
| R17 | Filming: Filming Approval Request Form | Step | CSRF |
| R18 | Co-sponsored events: review the co-sponsorship rules (Student Handbook p. 11, Q) | Step | CSRF |
| R19 | Elected officials or candidates: contact University Relations; follow the Political Site Visit policy | Step | CSRF |
| R20 | Amplified sound only if a room without nearby classes is available | Warning | CSRF |
| R21 | Furniture can't be added or removed; return the room to its original layout | Warning | CSRF |
| R23 | Permit form: not a space request (reserve first); needs the venue reservation number and venue manager contact; routes to departments; not an approval; print a copy. "Event" = 25+ people; meetings with only snacks need no permit | Permit step + checklist of what to prepare | UEPA (screenshots) |
| R22 | The non-discrimination and accessibility statements must appear in all event descriptions and marketing | Generates both with the club name | CSRF |

## Still unconfirmed

- **Weekend pages** of the CSRF (pages 5 and 7: weekend times and weekend room list) weren't in the screenshots.
- **Permit form pages 4–11** weren't captured. The chatbot only lists what the first three pages ask for.
- **Food permit trigger:** the CSRF's intro lists "your event has food" as a permit trigger, but its last page says food isn't allowed in classrooms at all. The chatbot follows the stricter rule (no food in classrooms).
- **Friday deadline:** the CSRF says both "Thursday 12 PM" and "within 48 hours not accepted." For a Friday event the 48-hour cutoff is earlier, so the chatbot uses it to be safe.
- **Form reopening dates** for the next term are estimates.
