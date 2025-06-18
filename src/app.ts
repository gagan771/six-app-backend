import express from 'express';
import dotenv from 'dotenv';
import otpRouter from './routes/otp.routes';
import userRouter from './routes/user.routes';
import sixAiRouter from './routes/sixai.routes';
import chatRouter from './routes/chat.routes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/otp', otpRouter);
app.use('/api/users', userRouter);
app.use('/api/sixai', sixAiRouter);
// app.use('/api/chat', chatRouter);

app.get('/', (_req, res) => {
  res.status(200).send('Six AI v3 Backend is running');
});

app.listen(PORT, async() => {
  console.log(`Server started at http://localhost:${PORT}`);
});
