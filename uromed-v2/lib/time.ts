import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
export const ZONE = "America/Mexico_City";
export const localToISO = (value: string) =>
  fromZonedTime(value, ZONE).toISOString();
export const localInput = (value: string) =>
  formatInTimeZone(value, ZONE, "yyyy-MM-dd'T'HH:mm");
export const prettyDate = (value: string) =>
  formatInTimeZone(value, ZONE, "dd/MM/yyyy HH:mm");
export const today = () => formatInTimeZone(new Date(), ZONE, "yyyy-MM-dd");
