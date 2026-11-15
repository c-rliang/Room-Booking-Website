// Seed requests shown alongside anything saved in localStorage.
export const seedRequests = [
  {
    id: 'RS-24817', roomId: 'r-cs-lounge', eventName: 'Filipino Student Assoc. Welcome Mixer',
    eventDate: '2025-09-12', eventTime: '6:00 - 8:30 PM', attendance: 42,
    submittedAt: '2025-08-29T15:12:00', status: 'Confirmed', food: true,
    forms: ['Room Request Form', 'Food Service Notice'],
    notes: 'Catering from an approved vendor. Confirmation email received.',
  },
  {
    id: 'RS-25103', roomId: 'r-hw-210', eventName: 'Robotics Club Info Session',
    eventDate: '2025-10-07', eventTime: '7:00 - 8:00 PM', attendance: 55,
    submittedAt: '2025-09-22T10:41:00', status: 'Needs Action', food: false,
    forms: ['Room Request Form'],
    notes: 'Advisor signature missing on the request form. Upload by Sept 30.',
  },
  {
    id: 'RS-25390', roomId: 'r-ok-studio', eventName: 'Open Mic: Fall Edition',
    eventDate: '2025-11-14', eventTime: '7:30 - 10:00 PM', attendance: 30,
    submittedAt: '2025-10-03T18:05:00', status: 'Submitted', food: true,
    forms: ['Room Request Form', 'Food Service Notice', 'Amplified Sound Permit'],
    notes: 'Waiting on venue coordinator review.',
  },
];
