const express = require('express')
const app = express()
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
app.use(express.json())
const path = require('path')
const dbpath = path.join(__dirname, 'userData.db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
let db = null

const initializer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializer()

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hasshedpass = await bcrypt.hash(password, 10)
  const query = `select * from user where username = '${username}';`
  const result = await db.get(query)
  if (result !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const newquery = `INSERT INTO 
        user(username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hasshedpass}', 
          '${gender}',
          '${location}'
        );`
      await db.run(newquery)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const query = `select * from user where username='${username}';`
  const result = await db.get(query)

  if (result === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, result.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

app.get('/user', async (request, response) => {
  let jwtToken
  const auth = request.headers['authorization']
  if (auth !== undefined) {
    jwtToken = auth.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.send('invalid jwttoken')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.send('wrong jwtToken')
      } else {
        const query = `select * from user;`
        const result = await db.all(query)
        response.send(result)
      }
    })
  }
})
module.exports = app
