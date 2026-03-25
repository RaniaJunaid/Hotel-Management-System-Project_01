
DROP TABLE IF EXISTS housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS reservation_services CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS room_status CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS payment_status_type CASCADE;
DROP TYPE IF EXISTS payment_method_type CASCADE;
DROP TYPE IF EXISTS payment_txn_status CASCADE;
DROP TYPE IF EXISTS task_type CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS invoice_payment_status CASCADE;



CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE invoice_payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE payment_method_type AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online');
CREATE TYPE payment_txn_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE task_type AS ENUM ('cleaning', 'maintenance', 'inspection', 'deep_clean');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');


CREATE TABLE roles (
    role_id     SERIAL PRIMARY KEY,
    role_name   VARCHAR(50)  UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_role_name_not_empty CHECK (role_name <> '')
);


CREATE TABLE branches (
    branch_id    SERIAL PRIMARY KEY,
    branch_name  VARCHAR(100) NOT NULL,
    branch_code  VARCHAR(10)  UNIQUE NOT NULL,
    address      VARCHAR(255) NOT NULL,
    city         VARCHAR(50)  NOT NULL,
    state        VARCHAR(50),
    country      VARCHAR(50)  NOT NULL,
    postal_code  VARCHAR(20),
    phone        VARCHAR(20)  NOT NULL,
    email        VARCHAR(100),
    manager_id   INT,          -- FK added after users table
    is_active    BOOLEAN      DEFAULT TRUE,
    opening_date DATE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_branch_code_format CHECK (branch_code ~ '^[A-Z0-9]+$')
);


CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    role_id       INT NOT NULL,
    branch_id     INT,
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login    TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_users_role   FOREIGN KEY (role_id)   REFERENCES roles(role_id),
    CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
    CONSTRAINT chk_username_length CHECK (CHAR_LENGTH(username) >= 3),
    CONSTRAINT chk_email_format    CHECK (email LIKE '%@%.%')
);

ALTER TABLE branches
    ADD CONSTRAINT fk_branches_manager FOREIGN KEY (manager_id) REFERENCES users(user_id);


CREATE TABLE room_types (
    room_type_id SERIAL PRIMARY KEY,
    type_name    VARCHAR(50) NOT NULL,
    description  TEXT,
    base_price   NUMERIC(10,2) NOT NULL,
    max_occupancy INT NOT NULL,
    amenities    JSONB,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_base_price_positive     CHECK (base_price > 0),
    CONSTRAINT chk_max_occupancy_positive  CHECK (max_occupancy > 0),
    CONSTRAINT chk_type_name_not_empty     CHECK (type_name <> '')
);


CREATE TABLE rooms (
    room_id               SERIAL PRIMARY KEY,
    branch_id             INT NOT NULL,
    room_type_id          INT NOT NULL,
    room_number           VARCHAR(20) NOT NULL,
    floor_number          INT,
    status                room_status DEFAULT 'available',
    is_active             BOOLEAN DEFAULT TRUE,
    last_maintenance_date DATE,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rooms_branch        FOREIGN KEY (branch_id)    REFERENCES branches(branch_id),
    CONSTRAINT fk_rooms_type          FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    CONSTRAINT uq_branch_room_number  UNIQUE (branch_id, room_number),
    CONSTRAINT chk_floor_number       CHECK (floor_number IS NULL OR floor_number >= 0)
);


CREATE TABLE guests (
    guest_id       SERIAL PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    email          VARCHAR(100) UNIQUE,
    phone          VARCHAR(20)  NOT NULL,
    date_of_birth  DATE,
    nationality    VARCHAR(50),
    id_type        VARCHAR(50),
    id_number      VARCHAR(100),
    address        VARCHAR(255),
    city           VARCHAR(50),
    country        VARCHAR(50),
    loyalty_points INT     DEFAULT 0,
    total_stays    INT     DEFAULT 0,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_loyalty_points_non_negative CHECK (loyalty_points >= 0),
    CONSTRAINT chk_total_stays_non_negative    CHECK (total_stays >= 0),
    CONSTRAINT chk_guest_names_not_empty       CHECK (first_name <> '' AND last_name <> '')
);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE reservations (
    reservation_id   SERIAL PRIMARY KEY,
    guest_id         INT NOT NULL,
    branch_id        INT NOT NULL,
    room_id          INT NOT NULL,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    actual_check_in  TIMESTAMP WITH TIME ZONE,
    actual_check_out TIMESTAMP WITH TIME ZONE,
    num_adults       INT NOT NULL,
    num_children     INT DEFAULT 0,
    status           reservation_status DEFAULT 'pending',
    special_requests TEXT,
    total_amount     NUMERIC(10,2) NOT NULL,
    created_by       INT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reservations_guest   FOREIGN KEY (guest_id)   REFERENCES guests(guest_id),
    CONSTRAINT fk_reservations_branch  FOREIGN KEY (branch_id)  REFERENCES branches(branch_id),
    CONSTRAINT fk_reservations_room    FOREIGN KEY (room_id)    REFERENCES rooms(room_id),
    CONSTRAINT fk_reservations_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT chk_checkout_after_checkin     CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_num_adults_positive        CHECK (num_adults > 0),
    CONSTRAINT chk_num_children_non_negative  CHECK (num_children >= 0),
    CONSTRAINT chk_total_amount_non_negative  CHECK (total_amount >= 0)
);

CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE invoices (
    invoice_id      SERIAL PRIMARY KEY,
    reservation_id  INT NOT NULL,
    invoice_number  VARCHAR(50)  UNIQUE NOT NULL,
    subtotal        NUMERIC(10,2) NOT NULL,
    tax_amount      NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_amount    NUMERIC(10,2) NOT NULL,
    payment_status  invoice_payment_status DEFAULT 'unpaid',
    issue_date      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date        DATE,
    notes           TEXT,

    CONSTRAINT fk_invoices_reservation       FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
    CONSTRAINT chk_subtotal_non_negative     CHECK (subtotal >= 0),
    CONSTRAINT chk_tax_amount_non_negative   CHECK (tax_amount >= 0),
    CONSTRAINT chk_discount_non_negative     CHECK (discount_amount >= 0),
    CONSTRAINT chk_inv_total_non_negative    CHECK (total_amount >= 0)
);

CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    invoice_id     INT NOT NULL,
    amount         NUMERIC(10,2) NOT NULL,
    payment_method payment_method_type NOT NULL,
    payment_date   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(100),
    processed_by   INT,
    status         payment_txn_status DEFAULT 'completed',
    notes          TEXT,

    CONSTRAINT fk_payments_invoice   FOREIGN KEY (invoice_id)   REFERENCES invoices(invoice_id),
    CONSTRAINT fk_payments_processor FOREIGN KEY (processed_by) REFERENCES users(user_id),
    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0)
);

CREATE TABLE services (
    service_id   SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    category     VARCHAR(50)  NOT NULL,
    description  TEXT,
    base_price   NUMERIC(10,2) NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_service_price_non_negative CHECK (base_price >= 0),
    CONSTRAINT chk_service_name_not_empty     CHECK (service_name <> '')
);

CREATE TABLE reservation_services (
    reservation_service_id SERIAL PRIMARY KEY,
    reservation_id         INT NOT NULL,
    service_id             INT NOT NULL,
    quantity               INT NOT NULL,
    unit_price             NUMERIC(10,2) NOT NULL,
    total_price            NUMERIC(10,2) NOT NULL,
    service_date           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes                  TEXT,

    CONSTRAINT fk_res_services_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
    CONSTRAINT fk_res_services_service     FOREIGN KEY (service_id)     REFERENCES services(service_id),
    CONSTRAINT chk_quantity_positive              CHECK (quantity > 0),
    CONSTRAINT chk_unit_price_non_negative        CHECK (unit_price >= 0),
    CONSTRAINT chk_service_total_non_negative     CHECK (total_price >= 0)
);

CREATE TABLE housekeeping_tasks (
    task_id        SERIAL PRIMARY KEY,
    room_id        INT NOT NULL,
    assigned_to    INT,
    task_type      task_type     NOT NULL,
    priority       task_priority DEFAULT 'medium',
    status         task_status   DEFAULT 'pending',
    scheduled_date DATE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes          TEXT,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_housekeeping_room     FOREIGN KEY (room_id)     REFERENCES rooms(room_id),
    CONSTRAINT fk_housekeeping_assigned FOREIGN KEY (assigned_to) REFERENCES users(user_id)
);


-- Users
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_role_branch   ON users(role_id, branch_id);
CREATE INDEX idx_users_username      ON users(username);

-- Branches
CREATE INDEX idx_branches_code         ON branches(branch_code);
CREATE INDEX idx_branches_city_country ON branches(city, country);
CREATE INDEX idx_branches_manager      ON branches(manager_id);

-- Rooms
CREATE INDEX idx_rooms_branch_status ON rooms(branch_id, status);
CREATE INDEX idx_rooms_type          ON rooms(room_type_id);
CREATE INDEX idx_rooms_status        ON rooms(status);

-- Guests
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_name  ON guests(last_name, first_name);

-- Reservations 
CREATE INDEX idx_reservations_guest        ON reservations(guest_id);
CREATE INDEX idx_reservations_dates        ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status       ON reservations(status);
CREATE INDEX idx_reservations_branch_dates ON reservations(branch_id, check_in_date, check_out_date);
CREATE INDEX idx_reservations_room         ON reservations(room_id);

-- Invoices
CREATE INDEX idx_invoices_number      ON invoices(invoice_number);
CREATE INDEX idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX idx_invoices_status      ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date    ON invoices(due_date);

-- Payments
CREATE INDEX idx_payments_invoice     ON payments(invoice_id);
CREATE INDEX idx_payments_date        ON payments(payment_date);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_method      ON payments(payment_method);

-- Services
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active   ON services(is_active);

-- Reservation services
CREATE INDEX idx_res_services_reservation ON reservation_services(reservation_id);
CREATE INDEX idx_res_services_service     ON reservation_services(service_id);

-- Housekeeping
CREATE INDEX idx_housekeeping_room_date      ON housekeeping_tasks(room_id, scheduled_date);
CREATE INDEX idx_housekeeping_assigned_status ON housekeeping_tasks(assigned_to, status);
CREATE INDEX idx_housekeeping_status         ON housekeeping_tasks(status);


CREATE VIEW available_rooms_view AS
SELECT
    b.branch_id,
    b.branch_name,
    b.city,
    b.state,
    b.country,
    r.room_id,
    r.room_number,
    r.floor_number,
    rt.room_type_id,
    rt.type_name       AS room_type,
    rt.base_price,
    rt.max_occupancy,
    rt.amenities,
    rt.description     AS room_description
FROM rooms r
JOIN branches   b  ON r.branch_id    = b.branch_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
WHERE r.status    = 'available'
  AND r.is_active = TRUE
  AND b.is_active = TRUE
ORDER BY b.branch_name, rt.base_price;

CREATE VIEW guest_loyalty_summary AS
SELECT
    g.guest_id,
    g.first_name,
    g.last_name,
    g.email,
    g.phone,
    g.loyalty_points,
    g.total_stays,
    COUNT(DISTINCT r.reservation_id) AS total_reservations,
    COALESCE(SUM(CASE WHEN r.status = 'checked_out' THEN i.total_amount ELSE 0 END), 0) AS lifetime_revenue,
    COALESCE(AVG(CASE WHEN r.status = 'checked_out' THEN i.total_amount ELSE NULL END), 0) AS avg_reservation_value,
    MAX(r.check_out_date) AS last_visit_date,
    (CURRENT_DATE - MAX(r.check_out_date))::INT AS days_since_last_visit, 
    CASE
        WHEN g.loyalty_points >= 1000 THEN 'Platinum'
        WHEN g.loyalty_points >= 500  THEN 'Gold'
        WHEN g.loyalty_points >= 100  THEN 'Silver'
        ELSE 'Bronze'
    END AS loyalty_tier
FROM guests g
LEFT JOIN reservations r ON g.guest_id       = r.guest_id
LEFT JOIN invoices     i ON r.reservation_id = i.reservation_id
GROUP BY g.guest_id, g.first_name, g.last_name, g.email, g.phone, g.loyalty_points, g.total_stays;

CREATE VIEW branch_performance_view AS
SELECT
    b.branch_id,
    b.branch_name,
    b.branch_code,
    b.city,
    b.country,
    u.full_name AS manager_name,

    -- Room metrics
    COUNT(DISTINCT rm.room_id) AS total_rooms,
    COUNT(DISTINCT CASE WHEN rm.status = 'occupied'  THEN rm.room_id END) AS occupied_rooms,
    COUNT(DISTINCT CASE WHEN rm.status = 'available' THEN rm.room_id END) AS available_rooms,
    ROUND(
        COALESCE(
            COUNT(DISTINCT CASE WHEN rm.status = 'occupied' THEN rm.room_id END) * 100.0
            / NULLIF(COUNT(DISTINCT rm.room_id), 0),
            0
        ), 2
    ) AS occupancy_rate,

    -- Current month metrics 
    COUNT(DISTINCT CASE
        WHEN EXTRACT(MONTH FROM r.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR  FROM r.created_at) = EXTRACT(YEAR  FROM CURRENT_DATE)
        THEN r.reservation_id
    END) AS monthly_reservations,

    COALESCE(SUM(CASE
        WHEN EXTRACT(MONTH FROM i.issue_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR  FROM i.issue_date) = EXTRACT(YEAR  FROM CURRENT_DATE)
         AND r.status = 'checked_out'
        THEN i.total_amount
        ELSE 0
    END), 0) AS monthly_revenue,

    ROUND(
        COALESCE(AVG(r.check_out_date - r.check_in_date), 0)::NUMERIC,
        1
    ) AS avg_stay_nights,

    COALESCE(SUM(CASE
        WHEN i.payment_status IN ('unpaid', 'partial') THEN i.total_amount
        ELSE 0
    END), 0) AS outstanding_payments

FROM branches b
LEFT JOIN users        u  ON b.manager_id    = u.user_id
LEFT JOIN rooms        rm ON b.branch_id     = rm.branch_id AND rm.is_active = TRUE
LEFT JOIN reservations r  ON b.branch_id     = r.branch_id
LEFT JOIN invoices     i  ON r.reservation_id = i.reservation_id
WHERE b.is_active = TRUE
GROUP BY b.branch_id, b.branch_name, b.branch_code, b.city, b.country, u.full_name;


CREATE OR REPLACE FUNCTION fn_prevent_double_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    booking_conflict INT;
BEGIN
    SELECT COUNT(*) INTO booking_conflict
    FROM reservations
    WHERE room_id = NEW.room_id
      AND status NOT IN ('cancelled', 'checked_out')
      AND (
          (NEW.check_in_date  BETWEEN check_in_date AND check_out_date)
          OR (NEW.check_out_date BETWEEN check_in_date AND check_out_date)
          OR (check_in_date BETWEEN NEW.check_in_date AND NEW.check_out_date)
      );

    IF booking_conflict > 0 THEN
        RAISE EXCEPTION 'Room is already reserved for these dates';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON reservations
FOR EACH ROW EXECUTE FUNCTION fn_prevent_double_booking();

CREATE OR REPLACE FUNCTION fn_check_room_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    max_capacity INT;
BEGIN
    SELECT rt.max_occupancy INTO max_capacity
    FROM rooms      r
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE r.room_id = NEW.room_id;

    IF (NEW.num_adults + NEW.num_children) > max_capacity THEN
        RAISE EXCEPTION 'Guest count exceeds room capacity';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER check_room_capacity
BEFORE INSERT ON reservations
FOR EACH ROW EXECUTE FUNCTION fn_check_room_capacity();

CREATE OR REPLACE FUNCTION fn_update_room_status_on_reservation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    hk_staff_id INT;
BEGIN
    IF NEW.status = 'checked_in' AND OLD.status <> 'checked_in' THEN
        UPDATE rooms SET status = 'occupied' WHERE room_id = NEW.room_id;
    END IF;

    IF NEW.status = 'checked_out' AND OLD.status <> 'checked_out' THEN
        UPDATE rooms SET status = 'available' WHERE room_id = NEW.room_id;

        SELECT u.user_id INTO hk_staff_id
        FROM users u
        WHERE u.role_id = (SELECT role_id FROM roles WHERE role_name = 'Housekeeping')
          AND u.branch_id = NEW.branch_id
          AND u.is_active = TRUE
        LIMIT 1;

        INSERT INTO housekeeping_tasks (room_id, task_type, priority, scheduled_date, status, assigned_to)
        VALUES (NEW.room_id, 'cleaning', 'high', CURRENT_DATE, 'pending', hk_staff_id);
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed', 'reserved') THEN
        UPDATE rooms SET status = 'available' WHERE room_id = NEW.room_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER update_room_status_on_reservation
AFTER UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION fn_update_room_status_on_reservation();

CREATE OR REPLACE FUNCTION fn_calculate_service_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_service_total_insert
BEFORE INSERT ON reservation_services
FOR EACH ROW EXECUTE FUNCTION fn_calculate_service_total();

CREATE TRIGGER calculate_service_total_update
BEFORE UPDATE ON reservation_services
FOR EACH ROW EXECUTE FUNCTION fn_calculate_service_total();

CREATE OR REPLACE FUNCTION fn_check_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    invoice_total      NUMERIC(10,2);
    paid_amount        NUMERIC(10,2);
    remaining_balance  NUMERIC(10,2);
BEGIN
    SELECT total_amount INTO invoice_total
    FROM invoices WHERE invoice_id = NEW.invoice_id;

    SELECT COALESCE(SUM(amount), 0) INTO paid_amount
    FROM payments
    WHERE invoice_id = NEW.invoice_id AND status = 'completed';

    remaining_balance := invoice_total - paid_amount;

    IF NEW.amount > (remaining_balance + 0.01) THEN
        RAISE EXCEPTION 'Payment amount exceeds invoice balance';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER check_payment_amount
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION fn_check_payment_amount();

CREATE OR REPLACE FUNCTION fn_update_invoice_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    invoice_total NUMERIC(10,2);
    total_paid    NUMERIC(10,2);
BEGIN
    SELECT i.total_amount,
           COALESCE(SUM(p.amount), 0)
    INTO invoice_total, total_paid
    FROM invoices i
    LEFT JOIN payments p ON i.invoice_id = p.invoice_id AND p.status = 'completed'
    WHERE i.invoice_id = NEW.invoice_id
    GROUP BY i.total_amount;

    UPDATE invoices
    SET payment_status = CASE
        WHEN total_paid >= (invoice_total - 0.01) THEN 'paid'::invoice_payment_status
        WHEN total_paid > 0                        THEN 'partial'::invoice_payment_status
        ELSE                                            'unpaid'::invoice_payment_status
    END
    WHERE invoice_id = NEW.invoice_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER update_invoice_payment_status
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION fn_update_invoice_payment_status();

DO $$
BEGIN
    RAISE NOTICE 'Schema creation completed successfully!';
    RAISE NOTICE 'Tables created: 12';
    RAISE NOTICE 'Indexes created: 30+';
    RAISE NOTICE 'Views created: 3';
    RAISE NOTICE 'Triggers created: 6';
END;
$$;