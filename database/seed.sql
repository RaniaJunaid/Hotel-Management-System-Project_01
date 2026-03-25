
SET session_replication_role = 'replica';

TRUNCATE TABLE housekeeping_tasks     RESTART IDENTITY CASCADE;
TRUNCATE TABLE reservation_services   RESTART IDENTITY CASCADE;
TRUNCATE TABLE services               RESTART IDENTITY CASCADE;
TRUNCATE TABLE payments               RESTART IDENTITY CASCADE;
TRUNCATE TABLE invoices               RESTART IDENTITY CASCADE;
TRUNCATE TABLE reservations           RESTART IDENTITY CASCADE;
TRUNCATE TABLE guests                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE rooms                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE room_types             RESTART IDENTITY CASCADE;
TRUNCATE TABLE users                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE branches               RESTART IDENTITY CASCADE;
TRUNCATE TABLE roles                  RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

INSERT INTO roles (role_name, description, permissions) VALUES
('Admin',        'Full system access with all permissions',        '{"all": true}'),
('Manager',      'Branch-level management and reporting',          '{"branch": "manage", "reports": "view", "staff": "manage"}'),
('Receptionist', 'Front desk – reservations, check-in/check-out', '{"reservations": "crud", "guests": "crud", "invoices": "read"}'),
('Housekeeping', 'Room cleaning and maintenance task management',  '{"tasks": "update", "rooms": "read"}');

INSERT INTO branches (branch_name, branch_code, address, city, state, country, postal_code, phone, email, is_active, opening_date) VALUES
('Grand Plaza NYC',     'NYC01', '123 5th Ave',        'New York',    'NY', 'USA', '10001', '+1-212-555-0100', 'nyc@grandplaza.com',     TRUE, '2020-01-15'),
('Grand Plaza LA',      'LAX01', '456 Sunset Blvd',    'Los Angeles', 'CA', 'USA', '90028', '+1-310-555-0200', 'la@grandplaza.com',      TRUE, '2020-03-20'),
('Grand Plaza Miami',   'MIA01', '789 Ocean Dr',        'Miami',       'FL', 'USA', '33139', '+1-305-555-0300', 'miami@grandplaza.com',   TRUE, '2020-06-10'),
('Grand Plaza Chicago', 'CHI01', '321 Michigan Ave',   'Chicago',     'IL', 'USA', '60611', '+1-312-555-0400', 'chicago@grandplaza.com', TRUE, '2020-09-05'),
('Grand Plaza Seattle', 'SEA01', '654 Pike St',         'Seattle',     'WA', 'USA', '98101', '+1-206-555-0500', 'seattle@grandplaza.com', TRUE, '2021-01-20');

INSERT INTO users (username, email, password_hash, full_name, phone, role_id, branch_id, is_active, last_login) VALUES
-- Admins (1)
('admin',      'admin@grandplaza.com',      '$2b$10$abcdefghij1', 'John Administrator', '+1-555-0001', 1, NULL, TRUE, '2026-02-18 09:00:00+00'),
-- Managers (5)
('mgr_nyc',   'sarah.j@grandplaza.com',    '$2b$10$abcdefghij2', 'Sarah Johnson',      '+1-212-555-0101', 2, 1, TRUE, '2026-02-18 08:30:00+00'),
('mgr_lax',   'michael.c@grandplaza.com',  '$2b$10$abcdefghij3', 'Michael Chen',       '+1-310-555-0201', 2, 2, TRUE, '2026-02-18 08:45:00+00'),
('mgr_mia',   'maria.r@grandplaza.com',    '$2b$10$abcdefghij4', 'Maria Rodriguez',    '+1-305-555-0301', 2, 3, TRUE, '2026-02-17 09:15:00+00'),
('mgr_chi',   'david.w@grandplaza.com',    '$2b$10$abcdefghij5', 'David Williams',     '+1-312-555-0401', 2, 4, TRUE, '2026-02-18 07:50:00+00'),
('mgr_sea',   'jennifer.k@grandplaza.com', '$2b$10$abcdefghij6', 'Jennifer Kim',       '+1-206-555-0501', 2, 5, TRUE, '2026-02-17 10:00:00+00'),
-- Receptionists (10)
('rec_nyc1',  'emily.b@grandplaza.com',    '$2b$10$abcdefghij7', 'Emily Brown',        '+1-212-555-0102', 3, 1, TRUE, '2026-02-18 07:00:00+00'),
('rec_nyc2',  'james.d@grandplaza.com',    '$2b$10$abcdefghij8', 'James Davis',        '+1-212-555-0103', 3, 1, TRUE, '2026-02-18 07:05:00+00'),
('rec_lax1',  'sophia.m@grandplaza.com',   '$2b$10$abcdefghij9', 'Sophia Martinez',    '+1-310-555-0202', 3, 2, TRUE, '2026-02-18 07:10:00+00'),
('rec_lax2',  'daniel.a@grandplaza.com',   '$2b$10$abcdefghij0', 'Daniel Anderson',    '+1-310-555-0203', 3, 2, TRUE, '2026-02-17 07:15:00+00'),
('rec_mia1',  'olivia.g@grandplaza.com',   '$2b$10$klmnopqrst1', 'Olivia Garcia',      '+1-305-555-0302', 3, 3, TRUE, '2026-02-18 07:20:00+00'),
('rec_mia2',  'william.l@grandplaza.com',  '$2b$10$klmnopqrst2', 'William Lopez',      '+1-305-555-0303', 3, 3, TRUE, '2026-02-18 07:25:00+00'),
('rec_chi1',  'ava.w@grandplaza.com',      '$2b$10$klmnopqrst3', 'Ava Wilson',         '+1-312-555-0402', 3, 4, TRUE, '2026-02-18 07:30:00+00'),
('rec_chi2',  'ethan.m@grandplaza.com',    '$2b$10$klmnopqrst4', 'Ethan Moore',        '+1-312-555-0403', 3, 4, TRUE, '2026-02-17 07:35:00+00'),
('rec_sea1',  'isabella.t@grandplaza.com', '$2b$10$klmnopqrst5', 'Isabella Taylor',    '+1-206-555-0502', 3, 5, TRUE, '2026-02-18 07:40:00+00'),
('rec_sea2',  'alex.t@grandplaza.com',     '$2b$10$klmnopqrst6', 'Alexander Thomas',   '+1-206-555-0503', 3, 5, TRUE, '2026-02-17 07:45:00+00'),
-- Housekeeping (9)
('hk_nyc1',  'carlos.s@grandplaza.com',   '$2b$10$klmnopqrst7', 'Carlos Sanchez',     '+1-212-555-0104', 4, 1, TRUE, '2026-02-18 06:00:00+00'),
('hk_nyc2',  'lisa.p@grandplaza.com',     '$2b$10$klmnopqrst8', 'Lisa Patel',         '+1-212-555-0105', 4, 1, TRUE, '2026-02-18 06:05:00+00'),
('hk_lax1',  'robert.h@grandplaza.com',   '$2b$10$klmnopqrst9', 'Robert Harris',      '+1-310-555-0204', 4, 2, TRUE, '2026-02-18 06:10:00+00'),
('hk_mia1',  'angela.c@grandplaza.com',   '$2b$10$klmnopqrst0', 'Angela Clark',       '+1-305-555-0304', 4, 3, TRUE, '2026-02-18 06:15:00+00'),
('hk_mia2',  'jose.f@grandplaza.com',     '$2b$10$uvwxyzabcd1', 'Jose Fernandez',     '+1-305-555-0305', 4, 3, TRUE, '2026-02-17 06:20:00+00'),
('hk_chi1',  'patricia.l@grandplaza.com', '$2b$10$uvwxyzabcd2', 'Patricia Lewis',     '+1-312-555-0404', 4, 4, TRUE, '2026-02-18 06:25:00+00'),
('hk_chi2',  'kevin.y@grandplaza.com',    '$2b$10$uvwxyzabcd3', 'Kevin Young',        '+1-312-555-0405', 4, 4, TRUE, '2026-02-17 06:30:00+00'),
('hk_sea1',  'michelle.h@grandplaza.com', '$2b$10$uvwxyzabcd4', 'Michelle Hall',      '+1-206-555-0504', 4, 5, TRUE, '2026-02-18 06:35:00+00'),
('hk_sea2',  'brian.a@grandplaza.com',    '$2b$10$uvwxyzabcd5', 'Brian Allen',        '+1-206-555-0505', 4, 5, TRUE, '2026-02-17 06:40:00+00');

UPDATE branches SET manager_id = 2 WHERE branch_id = 1;
UPDATE branches SET manager_id = 3 WHERE branch_id = 2;
UPDATE branches SET manager_id = 4 WHERE branch_id = 3;
UPDATE branches SET manager_id = 5 WHERE branch_id = 4;
UPDATE branches SET manager_id = 6 WHERE branch_id = 5;

INSERT INTO room_types (type_name, description, base_price, max_occupancy, amenities) VALUES
('Single',       'Cozy single-occupancy room with modern furnishings',              99.00,  1, '["WiFi","TV","AC","Safe","Hair Dryer"]'),
('Double',       'Comfortable double room ideal for couples or solo travelers',    149.00,  2, '["WiFi","TV","AC","Mini-bar","Safe"]'),
('Deluxe',       'Spacious deluxe room with panoramic city views',                249.00,  3, '["WiFi","TV","AC","Mini-bar","City View","Bathtub"]'),
('Suite',        'Luxury suite featuring a separate living area and kitchenette',  399.00,  4, '["WiFi","TV","AC","Mini-bar","City View","Kitchenette","Jacuzzi"]'),
('Presidential', 'Top-tier presidential suite with full kitchen and panoramic views', 799.00, 6, '["WiFi","TV","AC","Mini-bar","Panoramic View","Full Kitchen","Jacuzzi","Butler Service"]'),
('Family',       'Large family room with extra beds and child-friendly amenities', 299.00,  5, '["WiFi","TV","AC","Mini-bar","Extra Beds","Kid Zone"]');


-- NYC (branch 1)
INSERT INTO rooms (branch_id, room_type_id, room_number, floor_number, status, is_active, last_maintenance_date) VALUES
(1,1,'101',1,'available',TRUE,'2026-01-10'),
(1,2,'102',1,'available',TRUE,'2026-01-12'),
(1,2,'103',1,'occupied', TRUE,'2026-01-15'),
(1,3,'201',2,'available',TRUE,'2026-01-18'),
(1,3,'202',2,'available',TRUE,'2026-01-20'),
(1,4,'301',3,'available',TRUE,'2026-01-22'),
(1,4,'302',3,'occupied', TRUE,'2026-01-25'),
(1,5,'401',4,'available',TRUE,'2026-02-01'),
(1,6,'105',1,'available',TRUE,'2026-02-03'),
(1,6,'205',2,'maintenance',TRUE,'2026-02-05'),
(1,3,'203',2,'available',TRUE,'2026-01-28'),
(1,2,'104',1,'available',TRUE,'2026-01-30');

-- LA (branch 2)
INSERT INTO rooms (branch_id, room_type_id, room_number, floor_number, status, is_active, last_maintenance_date) VALUES
(2,1,'101',1,'available',TRUE,'2026-01-08'),
(2,2,'102',1,'available',TRUE,'2026-01-09'),
(2,2,'103',1,'available',TRUE,'2026-01-10'),
(2,3,'201',2,'available',TRUE,'2026-01-11'),
(2,3,'202',2,'occupied', TRUE,'2026-01-12'),
(2,4,'301',3,'available',TRUE,'2026-01-15'),
(2,4,'302',3,'available',TRUE,'2026-01-18'),
(2,5,'401',4,'available',TRUE,'2026-01-20'),
(2,6,'105',1,'available',TRUE,'2026-01-22'),
(2,6,'205',2,'available',TRUE,'2026-01-25'),
(2,3,'203',2,'available',TRUE,'2026-01-28'),
(2,2,'104',1,'reserved', TRUE,'2026-02-01');

-- Miami (branch 3)
INSERT INTO rooms (branch_id, room_type_id, room_number, floor_number, status, is_active, last_maintenance_date) VALUES
(3,1,'101',1,'occupied', TRUE,'2026-01-05'),
(3,2,'102',1,'available',TRUE,'2026-01-06'),
(3,2,'103',1,'available',TRUE,'2026-01-07'),
(3,3,'201',2,'available',TRUE,'2026-01-08'),
(3,3,'202',2,'available',TRUE,'2026-01-09'),
(3,4,'301',3,'occupied', TRUE,'2026-01-10'),
(3,4,'302',3,'available',TRUE,'2026-01-12'),
(3,5,'401',4,'available',TRUE,'2026-01-15'),
(3,6,'105',1,'available',TRUE,'2026-01-18'),
(3,6,'205',2,'available',TRUE,'2026-01-20'),
(3,3,'203',2,'maintenance',TRUE,'2026-01-22'),
(3,2,'104',1,'available',TRUE,'2026-01-25');

-- Chicago (branch 4)
INSERT INTO rooms (branch_id, room_type_id, room_number, floor_number, status, is_active, last_maintenance_date) VALUES
(4,1,'101',1,'available',TRUE,'2026-01-04'),
(4,2,'102',1,'available',TRUE,'2026-01-05'),
(4,2,'103',1,'available',TRUE,'2026-01-06'),
(4,3,'201',2,'occupied', TRUE,'2026-01-07'),
(4,3,'202',2,'available',TRUE,'2026-01-08'),
(4,4,'301',3,'available',TRUE,'2026-01-10'),
(4,4,'302',3,'available',TRUE,'2026-01-12'),
(4,5,'401',4,'available',TRUE,'2026-01-15'),
(4,6,'105',1,'available',TRUE,'2026-01-18'),
(4,6,'205',2,'available',TRUE,'2026-01-20'),
(4,3,'203',2,'available',TRUE,'2026-01-22'),
(4,2,'104',1,'reserved', TRUE,'2026-01-25');

-- Seattle (branch 5)
INSERT INTO rooms (branch_id, room_type_id, room_number, floor_number, status, is_active, last_maintenance_date) VALUES
(5,1,'101',1,'available',TRUE,'2026-01-03'),
(5,2,'102',1,'available',TRUE,'2026-01-04'),
(5,2,'103',1,'available',TRUE,'2026-01-05'),
(5,3,'201',2,'available',TRUE,'2026-01-06'),
(5,3,'202',2,'available',TRUE,'2026-01-07'),
(5,4,'301',3,'available',TRUE,'2026-01-08'),
(5,4,'302',3,'occupied', TRUE,'2026-01-10'),
(5,5,'401',4,'available',TRUE,'2026-01-12'),
(5,6,'105',1,'available',TRUE,'2026-01-15'),
(5,6,'205',2,'available',TRUE,'2026-01-18'),
(5,3,'203',2,'available',TRUE,'2026-01-20'),
(5,2,'104',1,'available',TRUE,'2026-01-22');

INSERT INTO guests (first_name, last_name, email, phone, date_of_birth, nationality, id_type, id_number, address, city, country, loyalty_points, total_stays) VALUES
('Robert',    'Smith',      'robert.smith@email.com',    '+1-555-1001', '1985-03-15', 'American',  'Passport',       'US1234567',  '123 Main St',          'New York',      'USA',       250, 5),
('Jennifer',  'Johnson',    'jennifer.j@email.com',      '+1-555-1002', '1990-07-22', 'American',  'Driver License', 'CA9876543',  '456 Oak Ave',          'Los Angeles',   'USA',       180, 3),
('Michael',   'Williams',   'michael.w@email.com',       '+1-555-1003', '1982-11-08', 'American',  'Passport',       'US2345678',  '789 Pine Rd',          'Chicago',       'USA',       420, 8),
('Sarah',     'Brown',      'sarah.brown@email.com',     '+1-555-1004', '1988-05-30', 'American',  'Driver License', 'FL8765432',  '321 Elm St',           'Miami',         'USA',       150, 2),
('David',     'Jones',      'david.jones@email.com',     '+44-555-1005','1975-09-12', 'British',   'Passport',       'GB3456789',  '654 High St',          'London',        'UK',        580,12),
('Emma',      'Garcia',     'emma.garcia@email.com',     '+34-555-1006','1993-02-18', 'Spanish',   'National ID',    'ES4567890',  '987 Gran Via',         'Madrid',        'Spain',      95, 1),
('James',     'Martinez',   'james.m@email.com',         '+1-555-1007', '1980-12-25', 'American',  'Passport',       'US5678901',  '147 Maple Dr',         'Seattle',       'USA',       310, 6),
('Sophia',    'Rodriguez',  'sophia.r@email.com',        '+52-555-1008','1987-06-14', 'Mexican',   'Passport',       'MX6789012',  '258 Reforma Ave',      'Mexico City',   'Mexico',    125, 2),
('William',   'Anderson',   'william.a@email.com',       '+1-555-1009', '1979-08-20', 'Canadian',  'Passport',       'CA7890123',  '369 King St',          'Toronto',       'Canada',    275, 5),
('Olivia',    'Taylor',     'olivia.t@email.com',        '+1-555-1010', '1991-04-03', 'American',  'Driver License', 'FL7654321',  '741 Beach Blvd',       'Miami',         'USA',       190, 3),
('Daniel',    'Thomas',     'daniel.thomas@email.com',   '+1-555-1011', '1986-10-17', 'American',  'Passport',       'US8901234',  '852 Park Ave',         'New York',      'USA',       340, 7),
('Isabella',  'Moore',      'isabella.m@email.com',      '+39-555-1012','1994-01-29', 'Italian',   'Passport',       'IT9012345',  '963 Via Roma',         'Rome',          'Italy',      85, 1),
('Matthew',   'Jackson',    'matthew.j@email.com',       '+61-555-1013','1983-07-11', 'Australian','Passport',       'AU0123456',  '159 George St',        'Sydney',        'Australia', 220, 4),
('Ava',       'White',      'ava.white@email.com',       '+1-555-1014', '1989-03-08', 'American',  'Driver License', 'IL6543210',  '357 Lake Dr',          'Chicago',       'USA',       165, 3),
('Ethan',     'Harris',     'ethan.h@email.com',         '+1-555-1015', '1977-12-05', 'American',  'Passport',       'US1230987',  '486 Hill St',          'Los Angeles',   'USA',       495,10),
('Mia',       'Martin',     'mia.martin@email.com',      '+33-555-1016','1992-09-23', 'French',    'Passport',       'FR2341098',  '597 Rue de Paris',     'Paris',         'France',    110, 2),
('Alexander', 'Thompson',   'alex.t@email.com',          '+1-555-1017', '1984-05-16', 'American',  'Driver License', 'WA5432109',  '628 River Rd',         'Seattle',       'USA',       285, 5),
('Charlotte', 'Garcia',     'charlotte.g@email.com',     '+1-555-1018', '1990-11-30', 'American',  'Driver License', 'FL4321098',  '739 Forest Ave',       'Miami',         'USA',       145, 2),
('Benjamin',  'Martinez',   'benjamin.m@email.com',      '+1-555-1019', '1981-08-27', 'American',  'Passport',       'US3210987',  '841 Valley St',        'New York',      'USA',       375, 8),
('Amelia',    'Robinson',   'amelia.r@email.com',        '+1-555-1020', '1995-04-12', 'American',  'Driver License', 'IL2109876',  '952 Mountain Dr',      'Chicago',       'USA',        75, 1),
('Lucas',     'Clark',      'lucas.clark@email.com',     '+44-555-1021','1978-10-09', 'British',   'Passport',       'GB1098765',  '163 Oxford St',        'London',        'UK',        420, 9),
('Harper',    'Rodriguez',  'harper.r@email.com',        '+1-555-1022', '1993-06-05', 'American',  'Driver License', 'CA0987654',  '274 Ocean Ave',        'Los Angeles',   'USA',       135, 2),
('Henry',     'Lewis',      'henry.lewis@email.com',     '+1-555-1023', '1987-02-28', 'Canadian',  'Passport',       'CA9876543',  '385 Bay St',           'Vancouver',     'Canada',    245, 4),
('Evelyn',    'Lee',        'evelyn.lee@email.com',      '+1-555-1024', '1991-12-18', 'American',  'Driver License', 'FL8765432',  '496 Sunset Dr',        'Miami',         'USA',       195, 3),
('Sebastian', 'Walker',     'sebastian.w@email.com',     '+49-555-1025','1980-09-07', 'German',    'Passport',       'DE7654321',  '507 Unter den Linden', 'Berlin',        'Germany',   315, 6),
('Aria',      'Hall',       'aria.hall@email.com',       '+1-555-1026', '1994-03-22', 'American',  'Driver License', 'NY6543210',  '618 Broadway',         'New York',      'USA',       125, 2),
('Jack',      'Allen',      'jack.allen@email.com',      '+61-555-1027','1982-11-14', 'Australian','Passport',       'AU5432109',  '729 Collins St',       'Melbourne',     'Australia', 275, 5),
('Scarlett',  'Young',      'scarlett.y@email.com',      '+1-555-1028', '1988-07-03', 'American',  'Driver License', 'IL4321098',  '831 Michigan Ave',     'Chicago',       'USA',       185, 3),
('Owen',      'King',       'owen.king@email.com',       '+1-555-1029', '1976-05-29', 'American',  'Passport',       'US3210987',  '942 1st Ave',          'Seattle',       'USA',       540,11),
('Grace',     'Wright',     'grace.wright@email.com',    '+1-555-1030', '1990-01-15', 'American',  'Driver License', 'CA2109876',  '153 Hollywood Blvd',   'Los Angeles',   'USA',       165, 3),
('Noah',      'Adams',      'noah.adams@email.com',      '+1-555-1031', '1983-04-22', 'American',  'Passport',       'US1098765',  '264 5th Ave',          'New York',      'USA',       310, 6),
('Lily',      'Baker',      'lily.baker@email.com',      '+1-555-1032', '1991-08-17', 'American',  'Driver License', 'WA0987654',  '375 Pine St',          'Seattle',       'USA',        90, 1),
('Logan',     'Carter',     'logan.carter@email.com',    '+44-555-1033','1979-11-03', 'British',   'Passport',       'GB9876543',  '486 Baker St',         'London',        'UK',        400, 8),
('Chloe',     'Davis',      'chloe.davis@email.com',     '+1-555-1034', '1996-02-14', 'American',  'Driver License', 'NY8765432',  '597 Madison Ave',      'New York',      'USA',        60, 1),
('Mason',     'Evans',      'mason.evans@email.com',     '+1-555-1035', '1985-06-30', 'American',  'Passport',       'US7654321',  '608 Wilshire Blvd',    'Los Angeles',   'USA',       235, 4),
('Ella',      'Foster',     'ella.foster@email.com',     '+49-555-1036','1992-09-11', 'German',    'Passport',       'DE6543210',  '719 Kurfurstendamm',   'Berlin',        'Germany',   175, 3),
('Liam',      'Green',      'liam.green@email.com',      '+1-555-1037', '1988-12-27', 'American',  'Driver License', 'FL5432109',  '820 Brickell Ave',     'Miami',         'USA',       290, 5),
('Zoe',       'Hall',       'zoe.hall@email.com',        '+1-555-1038', '1994-03-08', 'American',  'Driver License', 'IL4321098',  '931 State St',         'Chicago',       'USA',       115, 2),
('Aiden',     'Irving',     'aiden.irving@email.com',    '+61-555-1039','1981-07-19', 'Australian','Passport',       'AU3210987',  '142 Pitt St',          'Sydney',        'Australia', 355, 7),
('Penelope',  'Johnson',    'penelope.j@email.com',      '+1-555-1040', '1990-10-05', 'American',  'Driver License', 'CA2109876',  '253 Rodeo Dr',         'Beverly Hills', 'USA',       205, 4);

INSERT INTO services (service_name, category, description, base_price, is_active) VALUES
('Breakfast Buffet',         'Room Service',   'All-you-can-eat hot and cold breakfast spread',        25.00, TRUE),
('Lunch Set Menu',           'Room Service',   'Three-course lunch with beverage',                     35.00, TRUE),
('Dinner A La Carte',        'Room Service',   'Gourmet in-room dinner with chef selection',           65.00, TRUE),
('Laundry Per Item',         'Laundry',        'Wash, dry, and fold per garment',                       5.00, TRUE),
('Dry Cleaning Suit',        'Laundry',        'Professional dry cleaning for suits and formal wear',  18.00, TRUE),
('Express Laundry',          'Laundry',        'Same-day wash and return by 6 PM',                      8.00, TRUE),
('Swedish Massage 60min',    'Spa',            'Full body relaxing Swedish massage – 60 minutes',     120.00, TRUE),
('Deep Tissue Massage 90min','Spa',            'Therapeutic deep tissue massage – 90 minutes',        165.00, TRUE),
('Facial Treatment',         'Spa',            'Rejuvenating anti-aging facial treatment – 60 min',    95.00, TRUE),
('Airport Transfer',         'Transportation', 'Luxury sedan transfer to or from any airport',         75.00, TRUE),
('City Tour 4 Hours',        'Transportation', 'Guided sightseeing tour of city highlights',          150.00, TRUE),
('Car Rental Daily',         'Transportation', 'Premium vehicle rental for the day with insurance',    85.00, TRUE),
('Mini Bar Restock',         'In-Room',        'Full restock of mini bar beverages and snacks',        45.00, TRUE),
('Late Checkout',            'Front Desk',     'Guaranteed late checkout until 3 PM',                  50.00, TRUE),
('Early Checkin',            'Front Desk',     'Early room access from 10 AM subject to availability', 40.00, TRUE);

INSERT INTO reservations (guest_id, branch_id, room_id, check_in_date, check_out_date, actual_check_in, actual_check_out, num_adults, num_children, status, special_requests, total_amount, created_by) VALUES
(1,  1,  3,  '2026-02-10','2026-02-14','2026-02-10 15:30:00+00',NULL, 2,0,'checked_in','High floor preferred, extra pillows',   298.00, 7),
(2,  1,  7,  '2026-02-08','2026-02-12','2026-02-08 14:00:00+00',NULL, 2,1,'checked_in','Cot required for child',                1197.00, 7),
(3,  4,  37, '2026-02-09','2026-02-14','2026-02-09 16:00:00+00',NULL, 2,0,'checked_in','Quiet room away from elevator',          996.00,13),
(4,  2,  17, '2026-02-11','2026-02-15','2026-02-11 15:00:00+00',NULL, 2,0,'checked_in','Late arrival confirmed',                 747.00, 9),
(5,  3,  25, '2026-02-07','2026-02-10','2026-02-07 14:30:00+00',NULL, 1,0,'checked_in','Vegan meals requested',                  198.00,11),
(6,  3,  30, '2026-02-12','2026-02-17','2026-02-12 15:30:00+00',NULL, 2,2,'checked_in','Baby crib and high chair needed',       1596.00,11),
(7,  5,  56, '2026-02-10','2026-02-13','2026-02-10 16:00:00+00',NULL, 2,1,'checked_in','Airport pickup requested',               798.00,15),
(8,  1,  1,  '2026-02-17','2026-02-19','2026-02-17 13:00:00+00',NULL, 1,0,'checked_in','Honeymoon suite setup requested',        198.00, 7),
(9,  2,  13, '2026-02-16','2026-02-20','2026-02-16 14:30:00+00',NULL, 2,1,'checked_in','Adjoining rooms if possible',            447.00, 9),
(10, 3,  23, '2026-02-18','2026-02-22','2026-02-18 15:00:00+00',NULL, 3,0,'checked_in','Business facilities needed',             747.00,11),
(11, 1,  4,  '2026-02-22','2026-02-25',NULL,NULL, 2,1,'confirmed','Allergy to feather pillows – foam only',    747.00, 7),
(12, 4,  38, '2026-02-22','2026-02-26',NULL,NULL, 2,0,'confirmed','Non-smoking room required',                  747.00,13),
(13, 5,  51, '2026-02-25','2026-02-28',NULL,NULL, 2,0,'confirmed','Champagne on arrival',                       498.00,15),
(14, 2,  20, '2026-02-28','2026-03-04',NULL,NULL, 4,0,'confirmed','Two king beds preferred',                   1197.00, 9),
(15, 3,  26, '2026-03-01','2026-03-05',NULL,NULL, 2,0,'confirmed','Ocean view room if available',               747.00,11),
(16, 1,  6,  '2026-03-05','2026-03-09',NULL,NULL, 3,1,'confirmed','Early check-in requested',                  1197.00, 7),
(17, 4,  39, '2026-03-07','2026-03-11',NULL,NULL, 2,0,'confirmed','Corporate rate applicable',                 1197.00,13),
(18, 5,  52, '2026-03-10','2026-03-14',NULL,NULL, 2,2,'confirmed','Family package with kids meals',             897.00,15),
(19, 2,  21, '2026-03-12','2026-03-16',NULL,NULL, 5,1,'confirmed','Group booking – adjoining rooms',           2397.00, 9),
(20, 3,  27, '2026-03-15','2026-03-19',NULL,NULL, 2,0,'confirmed','Late checkout requested',                    897.00,11),
(21, 1,  2,  '2026-03-20','2026-03-23',NULL,NULL, 2,0,'pending','Room on highest floor available',              447.00, 7),
(22, 2,  14, '2026-03-22','2026-03-25',NULL,NULL, 2,1,'pending','Extra towels and pillows',                     447.00, 9),
(23, 3,  24, '2026-03-25','2026-03-28',NULL,NULL, 2,0,'pending','Fruit basket on arrival please',               447.00,11),
(24, 4,  40, '2026-03-28','2026-03-31',NULL,NULL, 2,0,'pending','Parking space required',                       498.00,13),
(25, 5,  50, '2026-04-01','2026-04-04',NULL,NULL, 2,0,'pending','Anniversary decoration requested',             447.00,15),
(26, 1,  2,  '2026-01-20','2026-01-23','2026-01-20 15:00:00+00','2026-01-23 11:00:00+00',2,0,'checked_out','No special requests',          447.00, 7),
(27, 2,  14, '2026-01-22','2026-01-25','2026-01-22 14:30:00+00','2026-01-25 10:30:00+00',2,1,'checked_out','Cot for child',                447.00, 9),
(28, 3,  24, '2026-01-25','2026-01-28','2026-01-25 16:00:00+00','2026-01-28 11:00:00+00',2,0,'checked_out','No special requests',          447.00,11),
(29, 4,  35, '2026-01-28','2026-01-31','2026-01-28 15:30:00+00','2026-01-31 10:00:00+00',2,0,'checked_out','Early checkout expected',      498.00,13),
(30, 5,  48, '2026-02-01','2026-02-05','2026-02-01 14:00:00+00','2026-02-05 11:00:00+00',2,0,'checked_out','No special requests',          447.00,15),
(31, 1,  5,  '2026-02-03','2026-02-07','2026-02-03 15:00:00+00','2026-02-07 10:30:00+00',2,1,'checked_out','Extra toiletries requested',   747.00, 7),
(32, 2,  18, '2026-02-05','2026-02-09','2026-02-05 16:00:00+00','2026-02-09 11:00:00+00',2,0,'checked_out','Business guest – quiet floor', 747.00, 9),
(33, 3,  29, '2026-01-15','2026-01-19','2026-01-15 14:30:00+00','2026-01-19 10:00:00+00',2,0,'checked_out','Late checkout approved',       1197.00,11),
(34, 4,  36, '2026-01-18','2026-01-22','2026-01-18 15:00:00+00','2026-01-22 11:00:00+00',3,0,'checked_out','Complimentary upgrade given',   747.00,13),
(35, 5,  49, '2026-01-20','2026-01-24','2026-01-20 16:00:00+00','2026-01-24 10:30:00+00',2,0,'checked_out','No special requests',           747.00,15),
(5,  1,  8,  '2026-01-10','2026-01-14','2026-01-10 14:00:00+00','2026-01-14 11:00:00+00',4,2,'checked_out','VIP guest – presidential suite',2397.00, 7),
(11, 2,  16, '2026-01-12','2026-01-16','2026-01-12 15:00:00+00','2026-01-16 10:00:00+00',2,0,'checked_out','Business stay',                  747.00, 9),
(15, 3,  28, '2026-01-15','2026-01-19','2026-01-15 16:00:00+00','2026-01-19 11:00:00+00',2,0,'checked_out','Spa package requested',         1197.00,11),
(19, 4,  41, '2026-01-18','2026-01-22','2026-01-18 14:30:00+00','2026-01-22 10:30:00+00',3,1,'checked_out','Group visit',                   1197.00,13),
(21, 5,  53, '2026-01-20','2026-01-24','2026-01-20 15:00:00+00','2026-01-24 11:00:00+00',2,0,'checked_out','No special requests',            897.00,15),
(1,  2,  15, '2026-02-14','2026-02-17',NULL,NULL,2,0,'cancelled','Change of travel plans',  298.00, 9),
(10, 4,  34, '2026-02-16','2026-02-19',NULL,NULL,1,0,'cancelled','Medical emergency',        198.00,13),
(18, 5,  50, '2026-02-18','2026-02-21',NULL,NULL,2,0,'cancelled','Duplicate booking',        298.00,15),
(25, 1,  9,  '2026-02-20','2026-02-24',NULL,NULL,3,2,'cancelled','Visa issue',               897.00, 7),
(27, 3,  31, '2026-02-22','2026-02-26',NULL,NULL,2,0,'cancelled','Flight cancelled',        1197.00,11),
(33, 2,  12, '2026-03-01','2026-03-04',NULL,NULL,1,0,'cancelled','Switched to another hotel', 99.00, 9),
(37, 4,  42, '2026-03-05','2026-03-08',NULL,NULL,2,0,'cancelled','Personal reasons',         298.00,13),
(39, 5,  57, '2026-03-10','2026-03-13',NULL,NULL,2,1,'cancelled','Budget constraints',       447.00,15),
(40, 1,  11, '2026-03-12','2026-03-15',NULL,NULL,2,0,'cancelled','Work schedule changed',    298.00, 8),
(36, 3,  22, '2026-03-15','2026-03-18',NULL,NULL,2,0,'cancelled','Family emergency',         298.00,12);

INSERT INTO invoices (reservation_id, invoice_number, subtotal, tax_amount, discount_amount, total_amount, payment_status, due_date, notes) VALUES
(1,  'INV-2026-0001', 298.00,  29.80,  0.00,  327.80, 'partial','2026-02-14','Deposit paid at check-in'),
(2,  'INV-2026-0002',1197.00, 119.70,  0.00, 1316.70, 'partial','2026-02-12','Partial payment received; balance due at checkout'),
(3,  'INV-2026-0003', 996.00,  99.60,  0.00, 1095.60, 'partial','2026-02-14','Corporate billing – PO#CHI-2026-003'),
(4,  'INV-2026-0004', 747.00,  74.70,  0.00,  821.70, 'partial','2026-02-15','Deposit collected on arrival'),
(5,  'INV-2026-0005', 198.00,  19.80,  0.00,  217.80, 'partial','2026-02-10','Prepaid online – remainder pending'),
(6,  'INV-2026-0006',1596.00, 159.60, 50.00, 1705.60, 'partial','2026-02-17','Loyalty discount applied'),
(7,  'INV-2026-0007', 798.00,  79.80,  0.00,  877.80, 'partial','2026-02-13','Airport pickup added to bill'),
(8,  'INV-2026-0008', 198.00,  19.80,  0.00,  217.80, 'partial','2026-02-19','Honeymoon package; deposit paid'),
(9,  'INV-2026-0009', 447.00,  44.70,  0.00,  491.70, 'partial','2026-02-20','Partial payment via credit card'),
(10, 'INV-2026-0010', 747.00,  74.70,  0.00,  821.70, 'partial','2026-02-22','Conference rate; deposit received'),
(11, 'INV-2026-0011', 747.00,  74.70,  0.00,  821.70, 'unpaid', '2026-02-25','Payment due at check-in'),
(12, 'INV-2026-0012', 747.00,  74.70,  0.00,  821.70, 'unpaid', '2026-02-26','Online booking – payment at property'),
(13, 'INV-2026-0013', 498.00,  49.80,  0.00,  547.80, 'unpaid', '2026-02-28','Early confirmation; pay on arrival'),
(14, 'INV-2026-0014',1197.00, 119.70,  0.00, 1316.70, 'unpaid', '2026-03-04','Group booking invoice'),
(15, 'INV-2026-0015', 747.00,  74.70,  0.00,  821.70, 'unpaid', '2026-03-05','Seasonal promotion applied'),
(16, 'INV-2026-0016',1197.00, 119.70,  0.00, 1316.70, 'unpaid', '2026-03-09','VIP guest – complimentary upgrade included'),
(17, 'INV-2026-0017',1197.00, 119.70,  0.00, 1316.70, 'unpaid', '2026-03-11','Corporate account #CHI-77'),
(18, 'INV-2026-0018', 897.00,  89.70,  0.00,  986.70, 'unpaid', '2026-03-14','Family package invoice'),
(19, 'INV-2026-0019',2397.00, 239.70,100.00, 2536.70, 'unpaid', '2026-03-16','Group discount of $100 applied'),
(20, 'INV-2026-0020', 897.00,  89.70,  0.00,  986.70, 'unpaid', '2026-03-19','Standard invoice'),
(21, 'INV-2026-0021', 447.00,  44.70,  0.00,  491.70, 'unpaid', '2026-03-23','Advance booking – pay at property'),
(22, 'INV-2026-0022', 447.00,  44.70,  0.00,  491.70, 'unpaid', '2026-03-25','Standard invoice'),
(23, 'INV-2026-0023', 447.00,  44.70,  0.00,  491.70, 'unpaid', '2026-03-28','Standard invoice'),
(24, 'INV-2026-0024', 498.00,  49.80,  0.00,  547.80, 'unpaid', '2026-03-31','Standard invoice with parking'),
(25, 'INV-2026-0025', 447.00,  44.70,  0.00,  491.70, 'unpaid', '2026-04-04','Anniversary special – fruit basket included'),
(26, 'INV-2026-0026', 447.00,  44.70,  0.00,  491.70, 'paid',   '2026-01-23','Fully settled at checkout'),
(27, 'INV-2026-0027', 447.00,  44.70,  0.00,  491.70, 'paid',   '2026-01-25','Paid in full – credit card'),
(28, 'INV-2026-0028', 447.00,  44.70,  0.00,  491.70, 'paid',   '2026-01-28','Cash payment received'),
(29, 'INV-2026-0029', 498.00,  49.80,  0.00,  547.80, 'paid',   '2026-01-31','Online prepaid – confirmed'),
(30, 'INV-2026-0030', 447.00,  44.70,  0.00,  491.70, 'paid',   '2026-02-05','Credit card – contactless'),
(31, 'INV-2026-0031', 747.00,  74.70,  0.00,  821.70, 'paid',   '2026-02-07','Paid at checkout; receipt emailed'),
(32, 'INV-2026-0032', 747.00,  74.70,  0.00,  821.70, 'paid',   '2026-02-09','Corporate direct billing settled'),
(33, 'INV-2026-0033',1197.00, 119.70,  0.00, 1316.70, 'paid',   '2026-01-19','Late checkout fee included'),
(34, 'INV-2026-0034', 747.00,  74.70,  0.00,  821.70, 'paid',   '2026-01-22','Paid in full – bank transfer'),
(35, 'INV-2026-0035', 747.00,  74.70,  0.00,  821.70, 'paid',   '2026-01-24','Standard checkout payment'),
(36, 'INV-2026-0036',2397.00, 239.70,  0.00, 2636.70, 'paid',   '2026-01-14','VIP stay – paid in full'),
(37, 'INV-2026-0037', 747.00,  74.70,  0.00,  821.70, 'paid',   '2026-01-16','Business guest – company card'),
(38, 'INV-2026-0038',1197.00, 119.70,  0.00, 1316.70, 'paid',   '2026-01-19','Spa package included; settled'),
(39, 'INV-2026-0039',1197.00, 119.70,  0.00, 1316.70, 'paid',   '2026-01-22','Group payment settled'),
(40, 'INV-2026-0040', 897.00,  89.70,  0.00,  986.70, 'paid',   '2026-01-24','Standard checkout'),
(41, 'INV-2026-0041', 298.00,  29.80,  0.00,  327.80, 'refunded','2026-02-17','Cancellation refund processed'),
(42, 'INV-2026-0042', 198.00,  19.80,  0.00,  217.80, 'refunded','2026-02-19','Refunded due to medical emergency'),
(43, 'INV-2026-0043', 298.00,  29.80,  0.00,  327.80, 'refunded','2026-02-21','Duplicate booking – full refund'),
(44, 'INV-2026-0044', 897.00,  89.70,  0.00,  986.70, 'refunded','2026-02-24','Visa issue – refund approved'),
(45, 'INV-2026-0045',1197.00, 119.70,  0.00, 1316.70, 'refunded','2026-02-26','Flight cancellation – refund issued'),
(46, 'INV-2026-0046',  99.00,   9.90,  0.00,  108.90, 'refunded','2026-03-04','Guest found alternate accommodation'),
(47, 'INV-2026-0047', 298.00,  29.80,  0.00,  327.80, 'refunded','2026-03-08','Personal reasons – partial stay refunded'),
(48, 'INV-2026-0048', 447.00,  44.70,  0.00,  491.70, 'refunded','2026-03-13','Budget constraints – refund processed'),
(49, 'INV-2026-0049', 298.00,  29.80,  0.00,  327.80, 'refunded','2026-03-15','Work schedule change – refund issued'),
(50, 'INV-2026-0050', 298.00,  29.80,  0.00,  327.80, 'refunded','2026-03-18','Family emergency – compassionate refund');

INSERT INTO payments (invoice_id, amount, payment_method, payment_date, transaction_id, processed_by, status, notes) VALUES
(1,  150.00,'credit_card', '2026-02-10 16:00:00+00','TXN-CC-0001', 7, 'completed','Deposit at check-in'),
(2,  600.00,'credit_card', '2026-02-08 14:30:00+00','TXN-CC-0002', 7, 'completed','50% deposit on arrival'),
(3,  500.00,'debit_card',  '2026-02-09 16:30:00+00','TXN-DB-0003',13, 'completed','Corporate card – part payment'),
(4,  400.00,'credit_card', '2026-02-11 15:30:00+00','TXN-CC-0004', 9, 'completed','Deposit paid on check-in'),
(5,  100.00,'online',      '2026-02-05 10:00:00+00','TXN-OL-0005',11, 'completed','Pre-payment via website'),
(6,  850.00,'credit_card', '2026-02-12 16:00:00+00','TXN-CC-0006',11, 'completed','Initial payment – loyalty discount deducted'),
(7,  440.00,'debit_card',  '2026-02-10 16:30:00+00','TXN-DB-0007',15, 'completed','Half payment at check-in'),
(8,  100.00,'online',      '2026-02-15 09:00:00+00','TXN-OL-0008', 7, 'completed','Online deposit'),
(9,  250.00,'credit_card', '2026-02-16 15:00:00+00','TXN-CC-0009', 9, 'completed','Partial payment on arrival'),
(10, 400.00,'credit_card', '2026-02-18 15:30:00+00','TXN-CC-0010',11, 'completed','Conference deposit'),
(26, 491.70,'credit_card', '2026-01-23 11:00:00+00','TXN-CC-0026', 7, 'completed','Full balance at checkout'),
(27, 491.70,'cash',        '2026-01-25 10:30:00+00', NULL,          9, 'completed','Cash payment at front desk'),
(28, 491.70,'credit_card', '2026-01-28 11:00:00+00','TXN-CC-0028',11, 'completed','Visa card – contactless'),
(29, 547.80,'debit_card',  '2026-01-31 10:00:00+00','TXN-DB-0029',13, 'completed','Debit card – full settle'),
(30, 491.70,'credit_card', '2026-02-05 11:00:00+00','TXN-CC-0030',15, 'completed','Mastercard payment'),
(31, 821.70,'credit_card', '2026-02-07 10:30:00+00','TXN-CC-0031', 7, 'completed','Full checkout payment'),
(32, 821.70,'online',      '2026-02-09 11:00:00+00','TXN-OL-0032', 9, 'completed','Bank transfer confirmed'),
(33,1316.70,'credit_card', '2026-01-19 10:00:00+00','TXN-CC-0033',11, 'completed','Late checkout included – paid in full'),
(34, 821.70,'bank_transfer','2026-01-22 11:00:00+00','TXN-BT-0034',13, 'completed','Corporate bank transfer'),
(35, 821.70,'cash',        '2026-01-24 10:30:00+00', NULL,         15, 'completed','Cash at front desk'),
(36,2636.70,'credit_card', '2026-01-14 11:00:00+00','TXN-CC-0036', 7, 'completed','VIP full payment – Amex'),
(37, 821.70,'credit_card', '2026-01-16 10:00:00+00','TXN-CC-0037', 9, 'completed','Business guest corporate card'),
(38,1316.70,'debit_card',  '2026-01-19 11:00:00+00','TXN-DB-0038',11, 'completed','Includes spa and services'),
(39,1316.70,'credit_card', '2026-01-22 10:30:00+00','TXN-CC-0039',13, 'completed','Group payment – lead guest card'),
(40, 986.70,'credit_card', '2026-01-24 11:00:00+00','TXN-CC-0040',15, 'completed','Final checkout payment'),
(41, 327.80,'credit_card', '2026-02-14 12:00:00+00','TXN-RF-0041', 9, 'refunded','Refund per cancellation policy'),
(42, 217.80,'credit_card', '2026-02-16 12:00:00+00','TXN-RF-0042',13, 'refunded','Medical refund – supporting doc received'),
(43, 327.80,'online',      '2026-02-18 12:00:00+00','TXN-RF-0043',15, 'refunded','Duplicate booking refund'),
(44, 986.70,'credit_card', '2026-02-20 12:00:00+00','TXN-RF-0044', 7, 'refunded','Visa issue – full refund authorised'),
(45,1316.70,'credit_card', '2026-02-22 12:00:00+00','TXN-RF-0045',11, 'refunded','Flight cancellation – full refund'),
(46, 108.90,'online',      '2026-03-01 12:00:00+00','TXN-RF-0046', 9, 'refunded','Guest switched hotel – refund issued'),
(47, 327.80,'credit_card', '2026-03-05 12:00:00+00','TXN-RF-0047',13, 'refunded','Personal reasons refund'),
(48, 491.70,'debit_card',  '2026-03-10 12:00:00+00','TXN-RF-0048',15, 'refunded','Budget constraints – refund confirmed'),
(49, 327.80,'credit_card', '2026-03-12 12:00:00+00','TXN-RF-0049', 7, 'refunded','Schedule change – refund processed'),
(50, 327.80,'online',      '2026-03-15 12:00:00+00','TXN-RF-0050',11, 'refunded','Compassionate refund authorised'),
(11, 821.70,'credit_card', '2026-02-21 09:00:00+00','TXN-CC-0051', 7, 'pending', 'Pre-authorisation hold placed'),
(12, 821.70,'online',      '2026-02-21 10:00:00+00','TXN-OL-0052',13, 'pending', 'Payment link sent to guest'),
(13, 547.80,'credit_card', '2026-02-24 09:00:00+00','TXN-CC-0053',15, 'pending', 'Awaiting guest confirmation'),
(14,1316.70,'bank_transfer','2026-02-27 09:00:00+00','TXN-BT-0054', 9, 'pending', 'Wire transfer initiated by guest'),
(15, 821.70,'credit_card', '2026-02-28 09:00:00+00','TXN-CC-0055',11, 'pending', 'Pre-auth for upcoming stay'),
(16,1316.70,'online',      '2026-03-04 09:00:00+00','TXN-OL-0056', 7, 'pending', 'Online payment pending 3D-Secure'),
(17,1316.70,'credit_card', '2026-03-06 09:00:00+00','TXN-CC-0057',13, 'pending', 'Corporate pre-payment pending'),
(18, 986.70,'debit_card',  '2026-03-09 09:00:00+00','TXN-DB-0058',15, 'pending', 'Family package pre-auth'),
(19,2536.70,'bank_transfer','2026-03-11 09:00:00+00','TXN-BT-0059', 9, 'pending', 'Group wire transfer in progress'),
(20, 986.70,'credit_card', '2026-03-14 09:00:00+00','TXN-CC-0060',11, 'pending', 'Booking guarantee hold');

INSERT INTO reservation_services (reservation_id, service_id, quantity, unit_price, total_price, notes) VALUES
(1,  1,  2,  25.00,   50.00,'Breakfast for 2 adults'),
(1,  14, 1,  50.00,   50.00,'Late checkout requested by guest'),
(2,  1,  3,  25.00,   75.00,'Breakfast for adults and child'),
(2,  7,  1, 120.00,  120.00,'Relaxation massage for one guest'),
(3,  1,  4,  25.00,  100.00,'Breakfast for 2 adults x 2 days'),
(3,  4,  5,   5.00,   25.00,'Laundry – 5 garments'),
(4,  1,  3,  25.00,   75.00,'Breakfast included in stay'),
(4,  10, 1,  75.00,   75.00,'Airport pickup on arrival'),
(5,  1,  2,  25.00,   50.00,'Vegan breakfast option'),
(6,  1,  4,  25.00,  100.00,'Breakfast for family'),
(6,  3,  2,  65.00,  130.00,'Dinner in room – 2 evenings'),
(7,  1,  3,  25.00,   75.00,'Breakfast x 3 days'),
(7,  4,  6,   5.00,   30.00,'Laundry for family clothes'),
(8,  15, 1,  40.00,   40.00,'Early check-in for honeymoon couple'),
(9,  13, 1,  45.00,   45.00,'Mini bar restocked on arrival'),
(10, 2,  3,  35.00,  105.00,'Lunch set menu for 3 guests'),
(26, 1,  3,  25.00,   75.00,'Breakfast x 3 nights'),
(27, 1,  3,  25.00,   75.00,'Breakfast – family stay'),
(28, 1,  3,  25.00,   75.00,'Breakfast included'),
(29, 5,  2,  18.00,   36.00,'Dry cleaning – 2 suits'),
(30, 1,  4,  25.00,  100.00,'Breakfast buffet x 4 days'),
(31, 7,  1, 120.00,  120.00,'Massage – relaxation stay'),
(31, 1,  3,  25.00,   75.00,'Breakfast for couple'),
(32, 11, 1, 150.00,  150.00,'City tour arranged by concierge'),
(32, 1,  3,  25.00,   75.00,'Breakfast x 3 days'),
(33, 8,  1, 165.00,  165.00,'Deep tissue massage – extended stay'),
(33, 1,  3,  25.00,   75.00,'Breakfast x 3 nights'),
(34, 1,  3,  25.00,   75.00,'Breakfast'),
(35, 12, 1,  85.00,   85.00,'Car rental – self-drive day trip'),
(36, 1,  6,  25.00,  150.00,'Breakfast for large group – 6 days'),
(36, 3,  2,  65.00,  130.00,'Dinner in room x 2 nights'),
(37, 1,  3,  25.00,   75.00,'Breakfast included'),
(38, 9,  1,  95.00,   95.00,'Facial treatment at hotel spa'),
(38, 1,  3,  25.00,   75.00,'Breakfast x 3 nights'),
(39, 1,  4,  25.00,  100.00,'Breakfast for group'),
(39, 10, 2,  75.00,  150.00,'Airport drop-off x2 guests'),
(40, 1,  3,  25.00,   75.00,'Breakfast'),
(40, 6,  4,   8.00,   32.00,'Express laundry – 4 items'),
(1,  13, 2,  45.00,   90.00,'Mini bar restocked twice'),
(5,  4,  3,   5.00,   15.00,'Laundry – 3 items');

INSERT INTO housekeeping_tasks (room_id, assigned_to, task_type, priority, status, scheduled_date, completed_date, notes) VALUES
(10, 17,'cleaning',    'high',   'completed','2026-02-11','2026-02-11 14:30:00+00','Post-checkout deep clean; room cleared'),
(5,  17,'inspection',  'low',    'completed','2026-02-09','2026-02-09 10:00:00+00','Pre-arrival inspection passed'),
(13, 19,'inspection',  'low',    'completed','2026-02-08','2026-02-08 11:00:00+00','Spot inspection – all clear'),
(25, 20,'deep_clean',  'medium', 'completed','2026-02-10','2026-02-10 16:00:00+00','Deep clean after extended stay'),
(48, 24,'cleaning',    'high',   'completed','2026-02-09','2026-02-09 15:00:00+00','Post-checkout turnaround'),
(35, 22,'maintenance', 'urgent', 'completed','2026-02-07','2026-02-07 13:00:00+00','Leaking faucet repaired'),
(16, 19,'deep_clean',  'medium', 'completed','2026-02-10','2026-02-10 14:00:00+00','Post-checkout thorough clean'),
(28, 20,'inspection',  'low',    'completed','2026-02-06','2026-02-06 10:00:00+00','Routine inspection – OK'),
(36, 22,'cleaning',    'high',   'completed','2026-02-08','2026-02-08 16:00:00+00','Checkout clean completed'),
(49, 24,'deep_clean',  'medium', 'completed','2026-02-05','2026-02-05 15:00:00+00','Deep clean – prior long-stay guest'),
(3,  17,'cleaning',    'high',   'in_progress','2026-02-19',NULL,'Occupied room daily service in progress'),
(7,  18,'cleaning',    'high',   'in_progress','2026-02-19',NULL,'Turndown service underway'),
(34, 22,'maintenance', 'high',   'in_progress','2026-02-19',NULL,'AC unit servicing – parts ordered'),
(37, 22,'maintenance', 'urgent', 'in_progress','2026-02-19',NULL,'Plumbing issue – plumber on site'),
(23, 20,'deep_clean',  'medium', 'in_progress','2026-02-19',NULL,'Mid-stay deep clean per guest request'),
(15, 19,'cleaning',    'high',   'pending','2026-02-20',NULL,'Pre-arrival clean for confirmed reservation'),
(26, 21,'cleaning',    'high',   'pending','2026-02-21',NULL,'Post-checkout expected tomorrow'),
(47, 24,'cleaning',    'high',   'pending','2026-02-21',NULL,'Room 302 checkout – prepare for next guest'),
(4,  17,'cleaning',    'medium', 'pending','2026-02-22',NULL,'Pre-arrival room prep'),
(14, 19,'cleaning',    'medium', 'pending','2026-02-23',NULL,'Regular service scheduled'),
(24, 20,'inspection',  'low',    'pending','2026-02-24',NULL,'Routine pre-arrival inspection'),
(39, 22,'cleaning',    'medium', 'pending','2026-02-25',NULL,'Standard clean between guests'),
(52, 24,'deep_clean',  'medium', 'pending','2026-02-26',NULL,'Deep clean scheduled post-long stay'),
(6,  17,'maintenance', 'high',   'pending','2026-02-27',NULL,'Window seal replacement needed'),
(18, 19,'cleaning',    'medium', 'pending','2026-02-28',NULL,'Turnaround for confirmed booking'),
(29, 20,'inspection',  'low',    'pending','2026-03-01',NULL,'Monthly inspection due'),
(40, 22,'cleaning',    'medium', 'pending','2026-03-02',NULL,'Standard checkout clean'),
(53, 24,'deep_clean',  'high',   'pending','2026-03-03',NULL,'Guest requested full refresh'),
(8,  17,'inspection',  'low',    'pending','2026-03-04',NULL,'Presidential suite quarterly check'),
(11, 18,'cleaning',    'medium', 'pending','2026-03-05',NULL,'Pre-arrival preparation');

DO $$
DECLARE
    v_roles              INT;
    v_users              INT;
    v_branches           INT;
    v_room_types         INT;
    v_rooms              INT;
    v_guests             INT;
    v_reservations       INT;
    v_invoices           INT;
    v_payments           INT;
    v_services           INT;
    v_reservation_svcs   INT;
    v_housekeeping       INT;
BEGIN
    SELECT COUNT(*) INTO v_roles             FROM roles;
    SELECT COUNT(*) INTO v_users             FROM users;
    SELECT COUNT(*) INTO v_branches          FROM branches;
    SELECT COUNT(*) INTO v_room_types        FROM room_types;
    SELECT COUNT(*) INTO v_rooms             FROM rooms;
    SELECT COUNT(*) INTO v_guests            FROM guests;
    SELECT COUNT(*) INTO v_reservations      FROM reservations;
    SELECT COUNT(*) INTO v_invoices          FROM invoices;
    SELECT COUNT(*) INTO v_payments          FROM payments;
    SELECT COUNT(*) INTO v_services          FROM services;
    SELECT COUNT(*) INTO v_reservation_svcs  FROM reservation_services;
    SELECT COUNT(*) INTO v_housekeeping      FROM housekeeping_tasks;

    RAISE NOTICE '=== SEED DATA VERIFICATION ===';
    RAISE NOTICE 'roles:                %', v_roles;
    RAISE NOTICE 'users:                %', v_users;
    RAISE NOTICE 'branches:             %', v_branches;
    RAISE NOTICE 'room_types:           %', v_room_types;
    RAISE NOTICE 'rooms:                %', v_rooms;
    RAISE NOTICE 'guests:               %', v_guests;
    RAISE NOTICE 'reservations:         %', v_reservations;
    RAISE NOTICE 'invoices:             %', v_invoices;
    RAISE NOTICE 'payments:             %', v_payments;
    RAISE NOTICE 'services:             %', v_services;
    RAISE NOTICE 'reservation_services: %', v_reservation_svcs;
    RAISE NOTICE 'housekeeping_tasks:   %', v_housekeeping;
    RAISE NOTICE '------------------------------';
    RAISE NOTICE 'TOTAL RECORDS:        %',
        v_roles + v_users + v_branches + v_room_types + v_rooms +
        v_guests + v_reservations + v_invoices + v_payments + v_services +
        v_reservation_svcs + v_housekeeping;
    RAISE NOTICE '==============================';
END;
$$;