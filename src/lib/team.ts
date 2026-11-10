import crypto from "node:crypto";
import { ageFrom } from "./nutrition/calc";

export const MIN_AGE = 16;
export const ADULT_AGE = 18;
export const MAX_SEATS = 200;
const DAY = 86_400_000;

/** Short, unambiguous invite code (no 0/O/1/I). */
export function newInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Monthly charge for a team: seats x price per athlete. */
export const subscriptionAmount = (seats: number, pricePerSeatCents: number) => Math.max(0, seats) * pricePerSeatCents;

/** Seats added mid-period are charged pro rata for the days left (at least 1, at most 30). */
export function topUpAmount(addedSeats: number, pricePerSeatCents: number, periodEnd: Date | null, now = new Date()) {
  if (addedSeats <= 0) return 0;
  const daysLeft = periodEnd ? Math.min(30, Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / DAY))) : 30;
  return Math.round((addedSeats * pricePerSeatCents * daysLeft) / 30);
}

/** Whether a new athlete can join. With payments off, teams are unlimited. */
export const hasFreeSeat = (seats: number, athletes: number, paymentsOff: boolean) => paymentsOff || athletes < seats;

/** 16-17 year olds need a coach to confirm guardian consent. */
export const needsConsent = (birthDate: Date, now = new Date()) => ageFrom(birthDate, now) < ADULT_AGE;

export const isMinor = needsConsent;
