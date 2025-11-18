// This file has been moved to backend/server.js as part of the refactor.
// The backend now lives entirely under the backend/ directory.

// Student registration endpoint with detailed error handling
app.post('/api/students/register', (req, res) => {
    console.log('Received registration request:', req.body);
    
    const { firstName, lastName, phoneNo, hostel } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !phoneNo || !hostel) {
        console.log('Missing required fields');
        return res.status(400).json({ 
            error: 'All fields are required',
            received: { firstName, lastName, phoneNo, hostel }
        });
    }

    // First check if phone number already exists
    const checkQuery = 'SELECT * FROM Student WHERE Phone_no = $1';
    pool.query(checkQuery, [phoneNo], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking existing student:', checkErr);
            return res.status(500).json({ error: checkErr.message });
        }

        if (checkResults.length > 0) {
            // User already exists
            console.log('Student already exists with phone:', phoneNo);
            return res.json({
                success: true,
                studentId: checkResults[0].Stud_ID,
                message: 'Welcome back!'
            });
        }

        // If user doesn't exist, create new account
        const insertQuery = 'INSERT INTO Student (FirstName, LastName, Phone_no, Hostel) VALUES ($1, $2, $3, $4) RETURNING Stud_ID';
        console.log('Executing query:', insertQuery, [firstName, lastName, phoneNo, hostel]);
        
        pool.query(insertQuery, [firstName, lastName, phoneNo, hostel], (insertErr, result) => {
            if (insertErr) {
                console.error('Error inserting new student:', insertErr);
                return res.status(500).json({ 
                    error: insertErr.message,
                    details: 'Failed to register new student'
                });
            }

            console.log('Successfully registered student:', result.rows[0]);
            res.json({
                success: true,
                studentId: result.rows[0].stud_id,
                message: 'Registration successful!'
            });
        });
    });
});

// Student login endpoint
// This is correct in your server.js
app.post('/api/students/login', (req, res) => {
    console.log('Login request received:', req.body);

    const { phoneNo } = req.body;
    
    if (!phoneNo) {
        console.log('No phone number provided');
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const query = 'SELECT Stud_ID, FirstName FROM Student WHERE Phone_no = $1';
    console.log('Executing login query with phone:', phoneNo);

    pool.query(query, [phoneNo], (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.rows.length === 0) {
            console.log('No student found with phone:', phoneNo);
            return res.status(401).json({ error: 'Student not found. Please sign up.' });
        }

        console.log('Student found:', results.rows[0]);
        res.json({
            success: true,
            studentId: results.rows[0].stud_id,
            firstName: results.rows[0].firstname
        });
    });
});

// Place order
app.post('/api/orders', async (req, res) => {
    const { items, totalAmount, studentId } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert payment
        const paymentResult = await client.query(
            'INSERT INTO Payment (Amount) VALUES ($1) RETURNING Payment_ID',
            [totalAmount]
        );
        const paymentId = paymentResult.rows[0].payment_id;

        // Insert order with Status
        const orderResult = await client.query(
            'INSERT INTO Orders (Stud_ID, Outlet_ID, Payment_ID, Status) VALUES ($1, $2, $3, $4) RETURNING Order_ID',
            [studentId, 1, paymentId, 'Pending']
        );
        const orderId = orderResult.rows[0].order_id;

        // Insert order items
        for (const item of items) {
            const menuItemResult = await client.query(
                'SELECT Item_ID FROM MenuItems WHERE Item_Name = $1 AND Outlet_ID = $2',
                [item.item, 1]
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

// Admin login with better error handling
app.post('/api/admin/login', (req, res) => {
    console.log('Admin login request:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const query = 'SELECT * FROM Admin WHERE Username = $1 AND Password = $2';
    pool.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = results.rows[0];
        res.json({
            success: true,
            token: 'dummy-token',
            outletId: admin.Outlet_ID
        });
    });
});

// Add menu item endpoint
app.post('/api/admin/menu/add', (req, res) => {
    console.log('Adding menu item:', req.body);
    
    const { name, price, category, outletId } = req.body;
    
    if (!name || !price || !outletId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = 'INSERT INTO MenuItems (Item_Name, Price, Outlet_ID) VALUES ($1, $2, $3) RETURNING Item_ID';
    
    pool.query(query, [name, price, outletId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            itemId: result.rows[0].item_id 
        });
    });
});

// Get menu items for outlet
app.get('/api/admin/menu/:outletId', (req, res) => {
    const query = 'SELECT * FROM MenuItems WHERE Outlet_ID = $1';
    
    pool.query(query, [req.params.outletId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results.rows);
    });
});

// Get all orders for outlet
app.get('/api/admin/orders/:outletId', (req, res) => {
    const query = `
        SELECT 
            o.Order_ID,
            (s.FirstName || ' ' || s.LastName) AS StudentName,
            json_agg(
                json_build_object(
                    'item_name', mi.Item_Name,
                    'price', oi.Price_At_Time,
                    'quantity', oi.Quantity
                )
            ) AS Items,
            p.Amount AS TotalAmount,
            o.Status
        FROM Orders o
        JOIN Student s ON o.Stud_ID = s.Stud_ID
        JOIN Payment p ON o.Payment_ID = p.Payment_ID
        JOIN OrderItems oi ON o.Order_ID = oi.Order_ID
        JOIN MenuItems mi ON oi.Item_ID = mi.Item_ID
        WHERE o.Outlet_ID = $1
        GROUP BY o.Order_ID, StudentName, p.Amount, o.Status
        ORDER BY o.Order_ID DESC;
    `;

    pool.query(query, [req.params.outletId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        const orders = results.rows.map(order => ({
            ...order,
            Items: order.items || []
        }));
        res.json(orders);
    });
});

// Delete menu item
app.delete('/api/admin/menu/delete/:itemId', (req, res) => {
    const query = 'DELETE FROM MenuItems WHERE Item_ID = $1';
    
    pool.query(query, [req.params.itemId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Mark order as completed
app.post('/api/admin/orders/complete/:orderId', (req, res) => {
    const query = 'UPDATE Orders SET Status = $1 WHERE Order_ID = $2';
    
    pool.query(query, ['Completed', req.params.orderId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Update order status
app.post('/api/admin/orders/updateStatus/:orderId', (req, res) => {
    const { status } = req.body;
    const query = 'UPDATE Orders SET Status = $1 WHERE Order_ID = $2';
    
    pool.query(query, [status, req.params.orderId], (err, result) => {
        if (err) {
            console.error('Update status error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});