const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'smp6340',
    password: 'smp13486340@',
    database: 'cuma'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// 회원가입
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?)';
    connection.query(query, [username, email, password], (err, result) => {
    if (err) {
        console.error('Error during signup:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        res.status(200).json({ message: 'Signup successful' });
    }
    });
});

// 로그인
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    connection.query(query, [username, password], (err, result) => {
    if (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        if (result.length > 0) {
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    }
    });
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
