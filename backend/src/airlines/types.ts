export type Airline = {
  icao: string;
  name: string | null;      // null when we know the code but not the airline
  telephony: string | null;
  country: string | null;
};