-- Supabase SQL voor Flexurity AbonnementenBeheer
-- Voer deze queries uit in de Supabase SQL Editor

-- Subscriptions table
CREATE TABLE subscriptions (
    document_name text,
    document_url text,
    document_path text,
    document_type text,
    document_content text,
    document_uploaded_at timestamptz DEFAULT now(),
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor text,
  contact_name text,
  contact_email text,
  contact_phone text,
  category text,
  type text,
  cost numeric,
  cost_period text,
  seats integer default 1,
  start_date date,
  end_date date,
  renewal_date date,
  status text default 'actief',
  auto_renew boolean default false,
  terms text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users
);

-- Category and type settings tables
CREATE TABLE subscription_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

CREATE TABLE subscription_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Reviews table
CREATE TABLE reviews (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  user_id uuid references auth.users,
  rating integer check (rating between 1 and 5),
  usage_pct integer check (usage_pct between 0 and 100),
  note text,
  created_at timestamptz default now()
);

-- Profiles table
CREATE TABLE profiles (
  id uuid primary key references auth.users,
  full_name text,
  role text default 'viewer'
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Subscriptions: viewers can read, admins can do everything
CREATE POLICY "Viewers can view subscriptions" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update subscriptions" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete subscriptions" ON subscriptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Reviews: everyone can read, authenticated users can insert their own
CREATE POLICY "Everyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profiles: users can view and update their own
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();