import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const openapiDoc = YAML.load('./openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
