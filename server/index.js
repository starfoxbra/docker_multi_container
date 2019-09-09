const keys = require(`./keys`);

//express set up
const express = require(`express`);
const bodyParser = require('body-parser')
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


//postgree client
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('error to connect pg'))

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));

    const redis = require('redis');

//redis connection
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});



const redisPublisher = redisClient.duplicate();

app.get(`/`, (req, res) => {
    res.send('hi')
})
app.get(`/values/all`, async (req, res) => {
    const values = await pgClient.query('select * from values');
    res.send(values.rows);
}
)

app.get(`/values/current`, async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        console.log(`recuperando os valores no redis:`+JSON.stringify(values))
        res.send(values);
    })
}
)

app.post(`/values`, async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('index too high')
    }
    redisClient.hset('values', index, 'nothing yet');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values (number) values ($1)', [index]);
    res.send({ working: true });
})

app.listen(5000, err => {
    console.log('Listening');
  });