const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;

const connection = mysql.createConnection({
    user: "root",
    password: "smp13486340@",
    database: "cuma",
    host: "127.0.0.1"
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
    const { id, email, password } = req.body;
    const query = 'INSERT INTO user (user_id, email, password) VALUES (?, ?, ?)';
    connection.query(query, [id, email, password], (err, result) => {
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
    const { id, password } = req.body;
    const query = 'SELECT * FROM user WHERE user_id = ? AND password = ?';
    connection.query(query, [id, password], (err, result) => {
      if (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (result.length > 0) {
          const userId = result[0].id;
          const accessToken = jwt.sign({ id: userId }, 'access_secret_key', { expiresIn: '3h' });
          const refreshToken = jwt.sign({ id: userId }, 'refresh_secret_key', { expiresIn: '7d' });
          res.status(200).json({ message: 'Login successful', access_token: accessToken, refresh_token: refreshToken });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      }
    });
});

//토큰 재발급
app.post('/token/refresh', (req, res) => {
    const { refresh_token } = req.body;
    try {
      const decodedToken = jwt.verify(refresh_token, 'refresh_secret_key');
      const userId = decodedToken.id;
      const accessToken = jwt.sign({ id: userId }, 'access_secret_key', { expiresIn: '15m' });
      res.status(200).json({ access_token: accessToken });
    } catch (error) {
      console.error('Error during token refresh:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
});
  
//카테고리 등록
app.post('/category', (req, res) => {
    const { title, locations } = req.body;
    try {
      const decodedToken = jwt.verify(req.headers.authorization.substring(7), 'access_secret_key');
      const userId = decodedToken.id;
  
      const query1 = `INSERT INTO category (title, user) VALUES (?, ?)`;
      connection.query(query1, [title, userId], (error, result) => {
        if (error) {
          if(error.errno === 1062) {
            res.status(409).json({ error: 'Overlapping Title' });
          }
          else {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
          }
        } else {
          let query2 = `INSERT INTO marker (category_id, title, info, lat, lng) VALUES `;
          locations.forEach((i, idx) => {
            query2 += `(${result.insertId},"${i.title}","${i.info}",${i.position.lat},${i.position.lng})`;
            if (idx !== locations.length - 1)
              query2 += ",";
          });
  
          connection.query(query2, (error2, result2) => {
            if (error2) {
              console.error('Error:', error2);
              res.status(500).json({ error: 'Internal Server Error' });
              connection.query(`DELETE FROM category WHERE id=${result.insertId}`);
            } else {
              res.status(200).json(result2);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(401).json({ error: 'Please log in first' });
    }
  });
  
app.get('/category', (req, res) => {
    const { q } = req.query;
  
    const query = `SELECT c.id, u.user_id, c.title, m.title AS marker_title, m.info, m.lat, m.lng FROM category c JOIN marker m ON c.id = m.category_id JOIN user u ON c.user = u.id${q ? ` WHERE c.title LIKE "${q}"` : ""}`;
  
    connection.query(query, (error, results) => {
      if (error) {
        console.error('데이터를 가져오는 중 오류 발생:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      const categoriesWithMarkers = {};
      results.forEach(row => {
        const categoryId = row.id;
        if (!categoriesWithMarkers[categoryId]) {
          categoriesWithMarkers[categoryId] = {
            id: categoryId,
            user: row.user_id,
            title: row.title,
            locations: []
          };
        }
        const marker = {
          title: row.marker_title,
          info: row.info,
          position: {
            lat: row.lat,
            lng: row.lng
          }
        };
        categoriesWithMarkers[categoryId].locations.push(marker);
      });
  
      res.json(Object.values(categoriesWithMarkers));
    });
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
