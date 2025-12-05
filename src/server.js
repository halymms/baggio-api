const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const logger = require('./middlewares/logger');
const properfyRoutes = require('./routes/properfyRoutes');
const port = 4000

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger);

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/api', properfyRoutes);

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})


// Handler para rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Handler para erros gerais
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});
