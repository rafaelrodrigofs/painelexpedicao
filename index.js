import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Rota básica funcionando!');
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 8080');
});