# Database Schema - Tours Admin Dashboard

## Overview

PostgreSQL database schema for the Tours Admin Dashboard, designed for Supabase.

## Tables

### 1. Users

```sql
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('basic', 'premium', 'top', null)),
  subscription_status VARCHAR(50) CHECK (subscription_status IN ('active', 'inactive', 'cancelled', null)),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 2. Cities

```sql
cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  state VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 3. Categories

```sql
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 4. Tours

```sql
tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  city_id UUID REFERENCES cities(id),
  price DECIMAL(10, 2) NOT NULL,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  language VARCHAR(10) DEFAULT 'es',
  featured_image_url TEXT,
  images JSONB,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  translations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
)
```

### 5. Tour Availability

```sql
tour_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  available_spots INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, date, time)
)
```

### 6. News

```sql
news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  featured_image_url TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  publish_date TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  translations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
)
```

### 7. Offers

```sql
offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
  discount_value DECIMAL(10, 2) NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
  image_url TEXT,
  landing_page_url TEXT,
  subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('basic', 'premium', 'top')),
  ranking INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  tour_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
)
```

### 8. Reservations

```sql
reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  tour_id UUID REFERENCES tours(id) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  participants INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
)
```

### 9. Payments

```sql
payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255),
  provider_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 10. Audit Logs

```sql
audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 11. Settings

```sql
settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 12. Analytics Events

```sql
analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Indexes

```sql
-- Users
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription ON users(subscription_plan, subscription_status);

-- Cities
CREATE INDEX idx_cities_slug ON cities(slug);
CREATE INDEX idx_cities_active ON cities(active);

-- Categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(active);

-- Tours
CREATE INDEX idx_tours_category ON tours(category_id);
CREATE INDEX idx_tours_city ON tours(city_id);
CREATE INDEX idx_tours_active ON tours(is_active);
CREATE INDEX idx_tours_featured ON tours(is_featured);

-- Tour Availability
CREATE INDEX idx_tour_availability_tour ON tour_availability(tour_id);
CREATE INDEX idx_tour_availability_date ON tour_availability(date);

-- News
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_publish_date ON news(publish_date);

-- Offers
CREATE INDEX idx_offers_active ON offers(is_active);
CREATE INDEX idx_offers_valid_dates ON offers(valid_from, valid_to);

-- Reservations
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_tour ON reservations(tour_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_date ON reservations(date);

-- Payments
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Analytics Events
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: Admin can do everything, staff can only read
CREATE POLICY "Admin full access to users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff can read users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Tours: Admin full access, staff read/write
CREATE POLICY "Admin full access to tours"
  ON tours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff read/write tours"
  ON tours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Similar policies for other tables...
```

## Views

```sql
-- Dashboard KPIs
CREATE VIEW dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM reservations WHERE status = 'confirmed') AS active_reservations,
  (SELECT COUNT(*) FROM payments WHERE status = 'completed') AS completed_payments,
  (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') AS active_subscriptions,
  (SELECT COUNT(*) FROM tours WHERE is_active = TRUE) AS total_tours;

-- Popular Tours
CREATE VIEW popular_tours AS
SELECT
  t.id,
  t.title,
  t.city_id,
  COUNT(r.id) AS reservation_count,
  SUM(r.total_price) AS total_revenue
FROM tours t
LEFT JOIN reservations r ON t.id = r.tour_id AND r.status = 'completed'
GROUP BY t.id, t.title, t.city_id
ORDER BY reservation_count DESC
LIMIT 10;
```

## Triggers

```sql
-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
