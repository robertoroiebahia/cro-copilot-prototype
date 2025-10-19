import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'smart-nudge-builder',
  name: 'Smart Nudge Builder',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
