const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// IMPORTANT: These middleware declarations must come BEFORE any routes
app.use(cors({
    origin: '*', // In production, replace with your specific domain
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.json());
// Serve static frontend files from the dedicated frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root route - serve main frontend entry
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Serve other HTML files directly
app.get('/frontend/:page', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', `${req.params.page}.html`));
});

// Postgres connection pool (reads config from environment for Docker)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'campus_user',
    password: process.env.DB_PASSWORD || 'campus_pass',
    database: process.env.DB_NAME || 'campus_food_delivery'
});

// Simple test to confirm DB connectivity on startup
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
                console.error('Error running startup test query:', err);
            })
    )
    .catch(err => {
        console.error('Error connecting to Postgres database on startup:', err);
    });

// Place order
app.post('/api/orders', async (req, res) => {
    const { items, totalAmount, studentId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const deliveryPersonRes = await client.query(
            'SELECT DeliveryPerson_ID FROM DeliveryPerson WHERE Outlet_ID = $1 LIMIT 1', [1]
        );
        if (deliveryPersonRes.rows.length === 0) {
            throw new Error('No delivery person available');
        }
        const deliveryPersonId = deliveryPersonRes.rows[0].deliveryperson_id;

        const paymentResult = await client.query(
            'INSERT INTO Payment (Amount) VALUES ($1) RETURNING Payment_ID',
            [totalAmount]
        );
        const paymentId = paymentResult.rows[0].payment_id;

        const orderResult = await client.query(
            'INSERT INTO Orders (Stud_ID, Outlet_ID, Payment_ID, Status) VALUES ($1, 1, $2, $3) RETURNING Order_ID',
            [studentId, paymentId, 'Pending']
        );
        const orderId = orderResult.rows[0].order_id;

        await client.query(
            'INSERT INTO DeliversTo (Order_ID, DeliveryPerson_ID, Stud_ID) VALUES ($1, $2, $3)',
            [orderId, deliveryPersonId, studentId]
        );

        for (const item of items) {
            const menuItemResult = await client.query(
                'SELECT Item_ID FROM MenuItems WHERE Item_Name = $1 AND Outlet_ID = 1',
                [item.item]
            );
            if (menuItemResult.rows.length > 0) {
                await client.query(
                    'INSERT INTO OrderItems (Order_ID, Item_ID, Quantity, Price_At_Time) VALUES ($1, $2, $3, $4)',
                    [orderId, menuItemResult.rows[0].item_id, item.quantity || 1, item.price]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            orderId: orderId,
            message: 'Order placed successfully!'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error placing order:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get order details
app.get('/api/orders/:orderId', async (req, res) => {
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
        WHERE o.Order_ID = $1
    `;

    try {
        const { rows } = await pool.query(query, [req.params.orderId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login endpoint
app.post('/api/students/login', async (req, res) => {
    const { phoneNo } = req.body;
    if (!phoneNo) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        const query = 'SELECT Stud_ID, FirstName FROM Student WHERE Phone_no = $1';
        const { rows } = await pool.query(query, [phoneNo]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Student not found. Please sign up.' });
        }
        res.json({
            success: true,
            studentId: rows[0].stud_id,
            firstName: rows[0].firstname
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Registration endpoint
app.post('/api/students/register', async (req, res) => {
    const { firstName, lastName, phoneNo, hostel } = req.body;

    try {
        const { rows } = await pool.query('SELECT * FROM Student WHERE Phone_no = $1', [phoneNo]);
        if (rows.length > 0) {
            return res.json({
                success: true,
                studentId: rows[0].stud_id,
                message: 'Welcome back!'
            });
        }

        const insertQuery = 'INSERT INTO Student (FirstName, LastName, Phone_no, Hostel) VALUES ($1, $2, $3, $4) RETURNING Stud_ID';
        const result = await pool.query(insertQuery, [firstName, lastName, phoneNo, hostel]);
        res.json({
            success: true,
            studentId: result.rows[0].stud_id,
            message: 'Registration successful!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const query = 'SELECT * FROM Admin WHERE Username = $1 AND Password = $2';
        const { rows } = await pool.query(query, [username, password]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const admin = rows[0];
        res.json({
            success: true,
            token: 'dummy-token',
            outletId: admin.outlet_id
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get all orders for an outlet (for admin)
app.get('/api/admin/orders/:outletId', async (req, res) => {
    const { outletId } = req.params;
    const query = `
        SELECT 
            o.order_id,
            s.firstname || ' ' || s.lastname AS studentname,
            p.amount AS totalamount,
            o.status,
            (SELECT json_agg(json_build_object('item_name', mi.item_name, 'price', oi.price_at_time, 'quantity', oi.quantity))
             FROM orderitems oi
             JOIN menuitems mi ON oi.item_id = mi.item_id
             WHERE oi.order_id = o.order_id) AS items
        FROM orders o
        JOIN student s ON o.stud_id = s.stud_id
        JOIN payment p ON o.payment_id = p.payment_id
        WHERE o.outlet_id = $1
        GROUP BY o.order_id, studentname, p.amount, o.status
        ORDER BY o.order_id DESC
    `;
    try {
        const { rows } = await pool.query(query, [outletId]);
        res.json(rows.map(r => ({ ...r, items: r.items || [] })));
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get menu items for an outlet
app.get('/api/admin/menu/:outletId', async (req, res) => {
    const { outletId } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM MenuItems WHERE Outlet_ID = $1', [outletId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a menu item
app.delete('/api/admin/menu/delete/:itemId', async (req, res) => {
    try {
        await pool.query('DELETE FROM MenuItems WHERE Item_ID = $1', [req.params.itemId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update order status
app.post('/api/admin/orders/updateStatus/:orderId', async (req, res) => {
    const { status } = req.body;
    if (!['Pending', 'Completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }
    try {
        const result = await pool.query('UPDATE Orders SET Status = $1 WHERE Order_ID = $2', [status, req.params.orderId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new menu item
app.post('/api/admin/menu/add', async (req, res) => {
    const { name, price, type, outletId } = req.body;
    try {
        const query = 'INSERT INTO MenuItems (Item_Name, Price, Type, Outlet_ID) VALUES ($1, $2, $3, $4) RETURNING Item_ID';
        const result = await pool.query(query, [name, price, type, outletId]);
        res.json({ success: true, itemId: result.rows[0].item_id });
    } catch (err) {
        console.error('Error adding menu item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delivery person login
app.post('/api/delivery/login', async (req, res) => {
    const { phoneNo } = req.body;
    if (!phoneNo) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        const query = 'SELECT DeliveryPerson_ID, Name, Outlet_ID FROM DeliveryPerson WHERE Phone_no = $1';
        const { rows } = await pool.query(query, [phoneNo]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({
            success: true,
            deliveryPersonId: rows[0].deliveryperson_id,
            name: rows[0].name,
            outletId: rows[0].outlet_id
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get delivery person's orders
app.get('/api/delivery/orders/:deliveryPersonId', async (req, res) => {
    const query = `
        SELECT 
            o.order_id,
            STRING_AGG(mi.item_name || ' (' || oi.quantity || ')', ', ') as orderitems,
            s.stud_id,
            s.phone_no as studentphone,
            s.hostel,
            o.status,
            p.amount as totalamount
        FROM DeliversTo dt
        JOIN Orders o ON dt.order_id = o.order_id
        JOIN Student s ON dt.stud_id = s.stud_id
        JOIN OrderItems oi ON o.order_id = oi.order_id
        JOIN MenuItems mi ON oi.item_id = mi.item_id
        JOIN Payment p ON o.payment_id = p.payment_id
        WHERE dt.deliveryperson_id = $1
        GROUP BY o.order_id, s.stud_id, s.phone_no, s.hostel, o.status, p.amount
        ORDER BY o.order_id DESC
    `;
    try {
        const { rows } = await pool.query(query, [req.params.deliveryPersonId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching delivery orders:', err);
        res.status(500).json({ error: err.message });
    }
});

// Submit a review
app.post('/api/reviews/submit', async (req, res) => {
    const { studentId, rating, description } = req.body;
    if (!studentId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid review data' });
    }
    try {
        const query = 'INSERT INTO Review (Stud_ID, Rating, Description) VALUES ($1, $2, $3) RETURNING Review_ID';
        const result = await pool.query(query, [studentId, rating, description || null]);
        res.json({ success: true, reviewId: result.rows[0].review_id });
    } catch (err) {
        console.error('Error submitting review:', err);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});