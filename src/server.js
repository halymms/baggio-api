require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const logger = require('./middlewares/logger');
const properfyRoutes = require('./routes/properfyRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const port = process.env.PORT || 4000;

const corsOptions = process.env.FRONTEND_URL
  ? { origin: process.env.FRONTEND_URL.split(',').map((o) => o.trim()) }
  : undefined;

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger);

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' });
});

app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/api', properfyRoutes);
app.use('/api', propertyRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App running on port ${port}.`);
  const { loadCashFlowPeriodos } = require('./services/cashFlowPeriods');
  loadCashFlowPeriodos()
    .then((payload) => {
      const anos = payload.periodos.map((periodo) => periodo.ano).join(', ');
      console.log(`Períodos de fluxo de caixa disponíveis: ${anos}`);
    })
    .catch((error) => {
      console.error('Falha ao carregar períodos de fluxo de caixa:', error.message);
    });
});
