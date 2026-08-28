-- Serialize active ownership changes and prevent shares above 100%.

CREATE OR REPLACE FUNCTION public.enforce_active_ownership_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(14, 12);
BEGIN
  IF NEW.valid_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM public.property_units
  WHERE id = NEW.property_unit_id
  FOR UPDATE;

  SELECT COALESCE(sum(ownership_share), 0)
  INTO v_total
  FROM public.property_ownerships
  WHERE property_unit_id = NEW.property_unit_id
    AND valid_to IS NULL
    AND id <> NEW.id;

  IF v_total + NEW.ownership_share > 1 THEN
    RAISE EXCEPTION 'Active ownership shares cannot exceed 100%%'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER property_ownerships_share_guard
  BEFORE INSERT OR UPDATE OF property_unit_id, ownership_share, valid_to
  ON public.property_ownerships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_ownership_share();
