const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// IMPORTANT: These middleware declarations must come BEFORE any routes
app.use(cors({
    origin: '*',  // In production, replace with your specific domain
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.json());
// Serve static frontend files from the dedicated frontend directory
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// Root route - serve main frontend entry
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Postgres connection pool (reads config from environment for Docker)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'campus_user',
    password: process.env.DB_PASSWORD || 'campus_pass',
    database: process.env.DB_NAME || 'campus_food_delivery'
});

// Simple test to confirm DB connectivity on startup (log errors but do not crash)
pool.connect()
    .then(client =>
        client
            .query('SELECT 1')
            .then(() => {
                console.log('Connected to Postgres database');
                client.release();
            })
            .catch(err => {
                client.release();
                console.error('Error running startup test query (will keep retrying on next queries):', err);
            })
    )
    .catch(err => {
        console.error('Error connecting to Postgres database on startup (backend will keep running):', err);
    });

// Get menu items for Red Chillies
app.get('/api/menu/redchillies', (req, res) => {
    const query = 'SELECT * FROM MenuItems WHERE Outlet_ID = 1';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get delivery person for Red Chillies
app.get('/api/deliveryperson/redchillies', (req, res) => {
    const query = 'SELECT * FROM DeliveryPerson WHERE Outlet_ID = 1';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results[0]);
    });
});

// Place order
app.post('/api/orders', (req, res) => {
    const { items, totalAmount, studentId } = req.body;
    
    // Start transaction
    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Transaction error:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        try {
            // Get delivery person for outlet 1 (Red Chillies)
            const [deliveryPerson] = await db.promise().query(
                'SELECT DeliveryPerson_ID FROM DeliveryPerson WHERE Outlet_ID = 1'
            );

            if (deliveryPerson.length === 0) {
                throw new Error('No delivery person available');
            }

            // Insert payment first
            const [paymentResult] = await db.promise().query(
                'INSERT INTO Payment (Amount) VALUES (?)',
                [totalAmount]
            );

            const paymentId = paymentResult.insertId;

            // Insert order
            const [orderResult] = await db.promise().query(
                'INSERT INTO Orders (Stud_ID, Outlet_ID, Payment_ID) VALUES (?, 1, ?)',
                [studentId, paymentId]
            );

            const orderId = orderResult.insertId;

            // Insert into DeliversTo table
            await db.promise().query(
                'INSERT INTO DeliversTo (Order_ID, DeliveryPerson_ID, Stud_ID) VALUES (?, ?, ?)',
                [orderId, deliveryPerson[0].DeliveryPerson_ID, studentId]
            );

            // Insert order items
            for (const item of items) {
                const [menuItem] = await db.promise().query(
                    'SELECT Item_ID FROM MenuItems WHERE Item_Name = ? AND Outlet_ID = 1',
                    [item.item]
                );

                if (menuItem.length > 0) {
                    await db.promise().query(
                        'INSERT INTO OrderItems (Order_ID, Item_ID, Quantity, Price_At_Time) VALUES (?, ?, ?, ?)',
                        [orderId, menuItem[0].Item_ID, 1, item.price]
                    );
                }
            }

            // Commit transaction
            await db.promise().commit();

            res.json({
                success: true,
                orderId: orderId,
                message: 'Order placed successfully!'
            });

        } catch (error) {
            await db.promise().rollback();
            res.status(500).json({ error: error.message });
        }
    });
});

// Add an endpoint to get order details
app.get('/api/orders/:orderId', (req, res) => {
    const query = `
        SELECT 
            o.Order_ID,
            o.Stud_ID,
            p.Amount as Total_Amount,
            oi.Quantity,
            oi.Price_At_Time,
            mi.Item_Name
        FROM Orders o
        JOIN Payment p ON o.Payment_ID = p.Payment_ID
        JOIN OrderItems oi ON o.Order_ID = oi.Order_ID
        JOIN MenuItems mi ON oi.Item_ID = mi.Item_ID
        WHERE o.Order_ID = ?
    `;

    db.query(query, [req.params.orderId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Login endpoint with better error handling
app.post('/api/students/login', (req, res) => {
    console.log('Login request received:', req.body); // Debug log

    const { phoneNo } = req.body;
    
    if (!phoneNo) {
        console.log('No phone number provided'); // Debug log
        res.status(400).json({ error: 'Phone number is required' });
        return;
    }

    const query = 'SELECT Stud_ID, FirstName FROM Student WHERE Phone_no = ?';
    
    console.log('Executing query:', query, 'with phone:', phoneNo); // Debug log

    db.query(query, [phoneNo], (err, results) => {
        if (err) {
            console.error('Database error:', err); // Debug log
            res.status(500).json({ error: err.message });
            return;
        }

        console.log('Query results:', results); // Debug log

        if (results.length === 0) {
            console.log('No student found with phone:', phoneNo); // Debug log
            res.status(401).json({ error: 'Student not found. Please sign up.' });
            return;
        }

        console.log('Student found:', results[0]); // Debug log

        res.json({
            success: true,
            studentId: results[0].Stud_ID,
            firstName: results[0].FirstName
        });
    });
});

// Update registration endpoint to check for existing user
app.post('/api/students/register', (req, res) => {
    const { firstName, lastName, phoneNo, hostel } = req.body;

    // First check if phone number already exists
    db.query('SELECT * FROM Student WHERE Phone_no = ?', [phoneNo], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (results.length > 0) {
            // User already exists, return their data
            res.json({
                success: true,
                studentId: results[0].Stud_ID,
                message: 'Welcome back!'
            });
            return;
        }

        // If user doesn't exist, create new account
        const query = 'INSERT INTO Student (FirstName, LastName, Phone_no, Hostel) VALUES (?, ?, ?, ?)';
        
        db.query(query, [firstName, lastName, phoneNo, hostel], (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({
                success: true,
                studentId: result.insertId,
                message: 'Registration successful!'
            });
        });
    });
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
    console.log('Received admin login request:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const query = 'SELECT * FROM Admin WHERE Username = ? AND Password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = results[0];
        res.json({
            success: true,
            token: 'dummy-token',
            outletId: admin.Outlet_ID
        });
    });
});

// Add these endpoints before app.listen

// Get menu items for admin dashboard
// Fix the customer-facing menu endpoint
app.get('/api/menu/redchillies', (req, res) => {
    const query = 'SELECT Item_ID, Item_Name, Price, Type FROM MenuItems WHERE Outlet_ID = 1';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Update the existing orders endpoint to use hardcoded outlet ID
app.get('/api/admin/orders/:outletId', (req, res) => {
    const query = `
        SELECT 
            o.Order_ID,
            CONCAT(s.FirstName, ' ', s.LastName) AS StudentName,
            GROUP_CONCAT(
                CONCAT('{"item_name":"', mi.Item_Name, 
                       '","price":', oi.Price_At_Time, 
                       ',"quantity":', oi.Quantity, '}')
            ) AS Items,
            p.Amount AS TotalAmount,
            COALESCE(o.Status, 'Pending') AS Status
        FROM Orders o
        JOIN Student s ON o.Stud_ID = s.Stud_ID
        JOIN Payment p ON o.Payment_ID = p.Payment_ID
        JOIN OrderItems oi ON o.Order_ID = oi.Order_ID
        JOIN MenuItems mi ON oi.Item_ID = mi.Item_ID
        WHERE o.Outlet_ID = ?
        GROUP BY o.Order_ID, o.Status, p.Amount, s.FirstName, s.LastName
        ORDER BY o.Order_ID DESC
    `;

    db.query(query, [req.params.outletId], (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        try {
            const formattedResults = results.map(row => ({
                ...row,
                Items: row.Items ? `[${row.Items}]` : '[]'
            })).map(row => ({
                ...row,
                Items: JSON.parse(row.Items)
            }));

            res.json(formattedResults);
        } catch (error) {
            console.error('Error parsing results:', error);
            res.status(500).json({ error: 'Error formatting order data' });
        }
    });
});

// Remove the duplicate endpoints and keep only these versions:
app.get('/api/admin/menu/:outletId', (req, res) => {
    const query = 'SELECT * FROM MenuItems WHERE Outlet_ID = 1';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Add endpoint for menu item deletion
app.delete('/api/admin/menu/delete/:itemId', (req, res) => {
    const query = 'DELETE FROM MenuItems WHERE Item_ID = ? AND Outlet_ID = 1';
    db.query(query, [req.params.itemId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Update order status endpoint
app.post('/api/admin/orders/updateStatus/:orderId', (req, res) => {
    const { status } = req.body;
    
    if (status !== 'Pending' && status !== 'Completed') {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const query = 'UPDATE Orders SET Status = ? WHERE Order_ID = ?';
    
    db.query(query, [status, req.params.orderId], (err, result) => {
        if (err) {
            console.error('Error updating order status:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ success: true });
    });
});

// Menu item add endpoint
app.post('/api/admin/menu/add', (req, res) => {
    console.log('Received menu item data:', req.body);
    const { name, price } = req.body;
    const query = 'INSERT INTO MenuItems (Item_Name, Price, Outlet_ID) VALUES (?, ?, 1)';
    
    db.query(query, [name, price], (err, result) => {
        if (err) {
            console.error('Error adding menu item:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Menu item added successfully:', result);
        res.json({ success: true, itemId: result.insertId });
    });
});

// Update the menu item add endpoint
app.post('/api/admin/menu/add', (req, res) => {
    const { name, price, type, outletId } = req.body;
    
    // First insert the menu item
    const insertQuery = 'INSERT INTO MenuItems (Item_Name, Price, Outlet_ID) VALUES (?, ?, ?)';
    
    db.query(insertQuery, [name, price, outletId], (err, result) => {
        if (err) {
            console.error('Error adding menu item:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        // Then update the type
        const updateQuery = 'UPDATE MenuItems SET Type = ? WHERE Item_ID = ?';
        db.query(updateQuery, [type, result.insertId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating item type:', updateErr);
                res.status(500).json({ error: updateErr.message });
                return;
            }
            res.json({ success: true, itemId: result.insertId });
        });
    });
});

// Delivery person login endpoint
app.post('/api/delivery/login', (req, res) => {
    const { phoneNo } = req.body;
    
    if (!phoneNo) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const query = 'SELECT DeliveryPerson_ID, Name, Outlet_ID FROM DeliveryPerson WHERE Phone_no = ?';
    db.query(query, [phoneNo], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            deliveryPersonId: results[0].DeliveryPerson_ID,
            name: results[0].Name,
            outletId: results[0].Outlet_ID
        });
    });
});

// Get delivery person's orders
app.get('/api/delivery/orders/:deliveryPersonId', (req, res) => {
    const query = `
        SELECT 
            o.Order_ID,
            GROUP_CONCAT(
                CONCAT(mi.Item_Name, ' (', oi.Quantity, ')')
                SEPARATOR ', '
            ) as OrderItems,
            s.Stud_ID,
            s.Phone_no as StudentPhone,
            s.Hostel,
            o.Status,
            p.Amount as TotalAmount
        FROM DeliversTo dt
        JOIN Orders o ON dt.Order_ID = o.Order_ID
        JOIN Student s ON dt.Stud_ID = s.Stud_ID
        JOIN OrderItems oi ON o.Order_ID = oi.Order_ID
        JOIN MenuItems mi ON oi.Item_ID = mi.Item_ID
        JOIN Payment p ON o.Payment_ID = p.Payment_ID
        WHERE dt.DeliveryPerson_ID = ?
        GROUP BY o.Order_ID
        ORDER BY o.Order_ID DESC
    `;

    db.query(query, [req.params.deliveryPersonId], (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Add this endpoint to handle review submissions
app.post('/api/reviews/submit', (req, res) => {
    const { studentId, rating, description } = req.body;
    
    if (!studentId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid review data' });
    }

    const query = 'INSERT INTO Review (Stud_ID, Rating, Description) VALUES (?, ?, ?)';
    
    db.query(query, [studentId, rating, description || null], (err, result) => {
        if (err) {
            console.error('Error submitting review:', err);
            res.status(500).json({ error: 'Failed to submit review' });
            return;
        }
        res.json({ success: true, reviewId: result.insertId });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});