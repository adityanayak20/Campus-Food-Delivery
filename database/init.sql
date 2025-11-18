-- Postgres schema for Campus Food Delivery

CREATE TABLE IF NOT EXISTS Student (
    Stud_ID SERIAL PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Hostel VARCHAR(50),
    Phone_no VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS Outlet (
    Outlet_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Contact_no BIGINT UNIQUE NOT NULL,
    Timing VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS MenuItems (
    Item_ID SERIAL PRIMARY KEY,
    Outlet_ID INT REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    Item_Name VARCHAR(100) NOT NULL,
    Price NUMERIC(10,2) NOT NULL,
    Type VARCHAR(10) DEFAULT 'Veg' -- 'Veg' or 'Non-Veg'
);

CREATE TABLE IF NOT EXISTS DeliveryPerson (
    DeliveryPerson_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone_no VARCHAR(15) UNIQUE NOT NULL,
    Outlet_ID INT REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payment (
    Payment_ID SERIAL PRIMARY KEY,
    Amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS Orders (
    Order_ID SERIAL PRIMARY KEY,
    Stud_ID INT REFERENCES Student(Stud_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    Outlet_ID INT REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    Payment_ID INT REFERENCES Payment(Payment_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    Status VARCHAR(20) DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS DeliversTo (
    Order_ID INT PRIMARY KEY REFERENCES Orders(Order_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    DeliveryPerson_ID INT REFERENCES DeliveryPerson(DeliveryPerson_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    Stud_ID INT REFERENCES Student(Stud_ID) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Review (
    Review_ID SERIAL PRIMARY KEY,
    Stud_ID INT REFERENCES Student(Stud_ID) ON DELETE CASCADE,
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    Description VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS OrderItems (
    OrderItem_ID SERIAL PRIMARY KEY,
    Order_ID INT REFERENCES Orders(Order_ID) ON DELETE CASCADE,
    Item_ID INT REFERENCES MenuItems(Item_ID) ON DELETE CASCADE,
    Quantity INT NOT NULL,
    Price_At_Time NUMERIC(10,2) NOT NULL
);

-- Seed basic data

INSERT INTO Outlet (Name, Contact_no, Timing)
VALUES 
    ('Red Chillies', 9876543210, '10:00 AM - 10:00 PM'),
    ('FoodKing',     9876543201, '10:00 AM - 10:00 PM'),
    ('IceNSpice',    9876543202, '11:00 AM - 11:00 PM'),
    ('Subspot',      9876543203, '09:00 AM - 09:00 PM'),
    ('FoodTruck',    9876543204, '06:00 PM - 11:59 PM')
ON CONFLICT DO NOTHING;

-- Red Chillies menu
INSERT INTO MenuItems (Outlet_ID, Item_Name, Price, Type)
VALUES
    (1, 'Honey Chilli Potato', 200.00, 'Veg'),
    (1, 'Veg 65',              160.00, 'Veg'),
    (1, 'Paneer Shawarma',      85.00, 'Veg'),
    (1, 'Veg Biryani',         120.00, 'Veg'),
    (1, 'Chicken Shawarma',    110.00, 'Non-Veg'),
    (1, 'Golden Fried Prawns', 300.00, 'Non-Veg'),
    (1, 'Chicken Biryani',     150.00, 'Non-Veg'),
    (1, 'Fish Fry',            200.00, 'Non-Veg')
ON CONFLICT DO NOTHING;

-- Delivery persons
INSERT INTO DeliveryPerson (Name, Phone_no, Outlet_ID)
VALUES 
    ('Riya',     '9000010001', 1),
    ('Pranavi',  '9000010002', 2),
    ('Tanush',   '9000010003', 3),
    ('Vijayant', '9000010004', 4),
    ('Goutham',  '9000010005', 5)
ON CONFLICT DO NOTHING;

-- Admin table and seed
CREATE TABLE IF NOT EXISTS Admin (
    Admin_ID SERIAL PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(100) NOT NULL,
    Outlet_ID INT REFERENCES Outlet(Outlet_ID)
);

INSERT INTO Admin (Username, Password, Outlet_ID)
VALUES ('admin1', 'admin123', 1)
ON CONFLICT (Username) DO NOTHING;


