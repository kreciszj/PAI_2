import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();

app.use(cors());
app.use(express.json());

const openapiDoc = YAML.load('./openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(3001, () => {
  console.log('API on http://localhost:3001');
});
