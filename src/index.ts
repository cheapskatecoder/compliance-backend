import express, { Request, Response } from 'express';
import apiRoutes from './api';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Please make a POST call to /api/check-compliance with a URL in the body');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
