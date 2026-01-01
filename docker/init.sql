-- Elo SQL runtime helper functions
-- These functions support type coercion and error handling

-- Error handling: throw an exception with the given message
CREATE OR REPLACE FUNCTION elo_fail(msg TEXT) RETURNS VOID AS $$
BEGIN
  RAISE EXCEPTION '%', msg;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Int - parse string to integer, throws on failure
CREATE OR REPLACE FUNCTION elo_int(v TEXT) RETURNS INTEGER AS $$
BEGIN
  RETURN v::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_int(v ANYELEMENT) RETURNS INTEGER AS $$
BEGIN
  RETURN v::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Float - parse string to double precision, throws on failure
CREATE OR REPLACE FUNCTION elo_float(v TEXT) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN v::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_float(v ANYELEMENT) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN v::DOUBLE PRECISION;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Date - parse ISO date string, throws on failure
CREATE OR REPLACE FUNCTION elo_date(v TEXT) RETURNS DATE AS $$
BEGIN
  IF v !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Type error at (root)';
  END IF;
  RETURN v::DATE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_date(v ANYELEMENT) RETURNS DATE AS $$
BEGIN
  RETURN v::DATE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Datetime - parse ISO datetime string, throws on failure
CREATE OR REPLACE FUNCTION elo_datetime(v TEXT) RETURNS TIMESTAMP AS $$
BEGIN
  RETURN v::TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_datetime(v ANYELEMENT) RETURNS TIMESTAMP AS $$
BEGIN
  RETURN v::TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Duration - parse ISO duration string, throws on failure
CREATE OR REPLACE FUNCTION elo_duration(v TEXT) RETURNS INTERVAL AS $$
BEGIN
  RETURN v::INTERVAL;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_duration(v ANYELEMENT) RETURNS INTERVAL AS $$
BEGIN
  RETURN v::INTERVAL;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Type selector: Data - parse JSON string to JSONB, throws on failure
CREATE OR REPLACE FUNCTION elo_data(v TEXT) RETURNS JSONB AS $$
BEGIN
  RETURN v::JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION elo_data(v ANYELEMENT) RETURNS JSONB AS $$
BEGIN
  RETURN to_jsonb(v);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Type error at (root)';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
