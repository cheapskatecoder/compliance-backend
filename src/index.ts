import express, { Request, Response } from 'express';
import apiRoutes from './api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}, process.env.OPEN_AI_KEY: ${process.env.OPEN_AI_KEY}`);
});
