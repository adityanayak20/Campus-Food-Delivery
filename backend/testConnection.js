const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Teresa89!', // The same password you're using
    database: 'CampusFoodDelivery'
});

connection.connect((err) => {
    if (err) {
        console.error('Connection failed:', err);
        return;
    }
    console.log('Successfully connected to MySQL!');
    connection.end();
}); 