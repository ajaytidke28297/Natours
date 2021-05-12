const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./App');
// Start server

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
