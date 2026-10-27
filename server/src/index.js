import { createApp } from "./app.js";
import { loadKb } from "./kb.js";

const port = Number(process.env.PORT) || 8787;
const app = createApp({ kb: loadKb(), allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173" });
app.listen(port, () => {
  console.log(`SIWES Guide API on :${port} (${process.env.GROQ_API_KEY ? "model" : "offline"} answers)`);
});
