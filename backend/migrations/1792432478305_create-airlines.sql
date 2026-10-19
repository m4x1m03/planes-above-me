-- Up Migration
CREATE TABLE airlines (
  icao      char(3) PRIMARY KEY,
  name      text NOT NULL,
  telephony text,
  country   text
);
-- Down Migration
DROP TABLE airlines;