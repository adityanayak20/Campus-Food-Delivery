CREATE DATABASE CampusFoodDelivery;
USE CampusFoodDelivery;

CREATE TABLE Student (
    Stud_ID INT PRIMARY KEY AUTO_INCREMENT,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL
    Hostel VARCHAR(50),
    Phone_no VARCHAR(15) NOT NULL
);

CREATE TABLE Outlet (
    Outlet_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Contact_no BIGINT(15) UNIQUE NOT NULL,
    Timing VARCHAR(100)
);
CREATE TABLE MenuItems (
    Item_ID INT PRIMARY KEY AUTO_INCREMENT,
    Outlet_ID INT,
    Price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Outlet_ID) REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE DeliveryPerson (
    DeliveryPerson_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Phone_no VARCHAR(15) UNIQUE NOT NULL
    Outlet_ID INT,
    FOREIGN KEY (Outlet_ID) REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE Orders (
    Order_ID INT PRIMARY KEY AUTO_INCREMENT,
    Stud_ID INT,
    Outlet_ID INT,
    Payment_ID INT,
    FOREIGN KEY (Stud_ID) REFERENCES Student(Stud_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (Outlet_ID) REFERENCES Outlet(Outlet_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (Payment_ID) REFERENCES Payment(Payment_ID) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE DeliversTo (
    Order_ID INT PRIMARY KEY,
    DeliveryPerson_ID INT,
    Stud_ID INT,
    FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (DeliveryPerson_ID) REFERENCES DeliveryPerson(DeliveryPerson_ID) ON UPDATE CASCADE ON DELETE CASCADE
    FOREIGN KEY (Stud_ID) REFERENCES Student(Student_ID) ON UPDATE CASCADE ON DELETE CASCADE
);


CREATE TABLE Payment (
    Payment_ID INT PRIMARY KEY AUTO_INCREMENT,
    Amount DECIMAL(10,2) NOT NULL,
);

CREATE TABLE Review (
    Review_ID INT PRIMARY KEY AUTO_INCREMENT,
    Stud_ID INT,
    Rating ENUM(1,2,3,4,5),
    Description VARCHAR(200),
    FOREIGN KEY (Stud_ID) REFERENCES Student(Stud_ID) ON DELETE CASCADE
);

CREATE TABLE OrderItems (
    OrderItem_ID INT PRIMARY KEY AUTO_INCREMENT,
    Order_ID INT,
    Item_ID INT,
    Quantity INT NOT NULL,
    Price_At_Time DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES MenuItems(Item_ID) ON DELETE CASCADE
);

INSERT INTO Outlet (Name, Contact_no, Timing) VALUES ('Red Chillies', 9876543210, '10:00 AM - 10:00 PM');

set @RedChilliesID = (select Outlet_ID from Outlet where Name = 'Red Chillies'); --need to get ID since its autoincremented.

ALTER TABLE MenuItems ADD COLUMN Item_Name VARCHAR(100) NOT NULL;

INSERT INTO MenuItems (Outlet_ID, Item_Name, Price) VALUES
(@RedChilliesID, 'Honey Chilli Potato', 200.00),
(@RedChilliesID, 'Veg 65', 160.00),
(@RedChilliesID, 'Paneer Shawarma', 85.00),
(@RedChilliesID, 'Veg Biryani', 120.00),
(@RedChilliesID, 'Chicken Shawarma', 110.00),
(@RedChilliesID, 'Golden Fried Prawns', 300.00),
(@RedChilliesID, 'Chicken Biryani', 150.00),
(@RedChilliesID, 'Fish Fry', 200.00);

--ADDING VIEW FOR CUSTOMER (ONLY SELECT PRIVILEGE)
CREATE USER 'Customer'@'localhost' IDENTIFIED BY 'user123';

GRANT SELECT ON CampusFoodDelivery.outlet TO 'Customer'@'localhost';
GRANT SELECT ON CampusFoodDelivery.menuitems TO 'Customer'@'localhost';
GRANT SELECT ON CampusFoodDelivery.review TO 'Customer'@'localhost';
FLUSH PRIVILEGES;

--ADDING VIEW FOR MANAGER (SELECT AND UPDATE)
CREATE USER 'Manager'@'localhost' IDENTIFIED BY 'mgr123';
GRANT SELECT, UPDATE ON CampusFoodDelivery.* TO 'Manager'@'localhost';
FLUSH PRIVILEGES;

-- Add the 4 remaining outlets
INSERT INTO Outlet (Name, Contact_no, Timing)
VALUES 
('FoodKing', 9876543201, '10:00 AM - 10:00 PM'),
('IceNSpice', 9876543202, '11:00 AM - 11:00 PM'),
('Subspot', 9876543203, '09:00 AM - 09:00 PM'),
('FoodTruck', 9876543204, '06:00 PM - 11:59 PM');

-- Add delivery persons linked to outlets
INSERT INTO DeliveryPerson (Name, Phone_no, Outlet_ID)
VALUES 
('Riya', '9000010001', 1),         
('Pranavi', '9000010002', 2),      
('Tanush', '9000010003', 3),       
('Vijayant', '9000010004', 4),     
('Goutham', '9000010005', 5);       

-- Create Admin table
CREATE TABLE Admin (
    Admin_ID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(100) NOT NULL,
    Outlet_ID INT,
    FOREIGN KEY (Outlet_ID) REFERENCES Outlet(Outlet_ID)
);

-- Insert test admin for Red Chillies (Outlet_ID = 1)
INSERT INTO Admin (Username, Password, Outlet_ID) 
VALUES ('admin1', 'admin123', 1);

ALTER TABLE MenuItems ADD COLUMN Type ENUM('Veg', 'Non-Veg') NOT NULL DEFAULT 'Veg';
UPDATE MenuItems SET Type = 'Non-Veg' WHERE Item_Name IN ('Chicken Shawarma', 'Golden Fried Prawns', 'Chicken Biryani','Chicken Lollipop');