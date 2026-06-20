CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,                        -- "Ivan Petrov Georgiev"
  initials TEXT,                         -- "IPG" — auto-generated
  phone TEXT,
  address TEXT,
  access_level INTEGER NOT NULL DEFAULT 1,  -- 1,2,3,4
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate initials от full_name
CREATE OR REPLACE FUNCTION generate_initials(full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  words TEXT[];
  initials TEXT := '';
  word TEXT;
BEGIN
  words := string_to_array(trim(full_name), ' ');
  FOREACH word IN ARRAY words LOOP
    initials := initials || upper(left(word, 1));
  END LOOP;
  RETURN initials;
END;
$$ LANGUAGE plpgsql;

-- Trigger: попълва initials автоматично при insert/update
CREATE OR REPLACE FUNCTION set_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.initials := generate_initials(NEW.full_name);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_initials
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_initials();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Потребителят вижда само своя профил"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Потребителят може да ъпдейтва своя профил"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Админът вижда всички профили"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );