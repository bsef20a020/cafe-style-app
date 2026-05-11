const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`NOFFELO MERN API listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API", error);
    process.exit(1);
  }
}

start();
