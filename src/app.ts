import express from 'express';
import dotenv from 'dotenv';
import otpRouter from './routes/otp';
import userRouter from './routes/userRoutes';
import sixAiRouter from './routes/sixAi';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/otp', otpRouter);
app.use('/api/users', userRouter);
app.use('/api/sixai', sixAiRouter);

app.get('/', (_req, res) => {
  res.send('OTP Backend is runnig');
});

app.listen(PORT, async() => {
  console.log(`Server started at http://localhost:${PORT}`);
});
