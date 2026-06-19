import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client with env key and custom User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Chatbot proxy endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemInstruction = `You are FuMao Bangladesh Technology Co., Ltd.'s AI Business Assistant. 
FuMao BTCL is a premier eco-friendly non-woven bag manufacturer and exporter based in Ashulia, Savar, Dhaka, Bangladesh.
They produce high-quality, ISO 9001 certified D-Cut, W-Cut, Loop Handle, Box, and custom printed non-woven bags.
Your goals:
1. Speak confidently, professionally, and warmly.
2. Answer inquiries about MOQ (minimum order quantities: usually 5,000 to 10,000 bags depending on customization), specifications (GSM weight ranges: 40-120 GSM), manufacturing process, global shipping, or request free samples.
3. Be clear that for exact custom quotes, customers can also submit the 'Bulk Quote Form' next to you.
Keep responses concise, clear, and action-oriented. Encourage the user to contact us or ask for samples.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.sender === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback mock responses if the key is not set up in the platform secrets yet
      console.warn("GEMINI_API_KEY is not defined. Using smart local assistant fallback.");
      let responseText = `Thank you for asking! I'm the FuMao AI Assistant. 
Currently, the live Gemini network is in local sandbox mode. Here are some quick details:
- **MOQ:** Our standard minimum order quantity is 5,000 pcs for custom prints.
- **Bag types:** D-Cut, W-Cut, Loop Handle, and Box bags.
- **Factory location:** Savage/Ashulia, Dhaka, Bangladesh.
- **Certification:** ISO 9001:2015 fully certified.

If you have custom requirements (sizes, color, printing), please switch to the "Bulk Quote Form" tab or send an email to fumaobdtechltd@gmail.com!`;
      
      const promptLower = message.toLowerCase();
      if (promptLower.includes("moq") || promptLower.includes("minimum")) {
        responseText = "Our standard minimum order quantity (MOQ) is 5,000 pieces for standard bag styles and 10,000 pieces for high-spec customized screen-printed loop handle bags. Let us know if you need mock samples!";
      } else if (promptLower.includes("price") || promptLower.includes("cost") || promptLower.includes("rate")) {
        responseText = "Pricing depends on bag size, fabric GSM (thickness), and printing colors. Please switch to our 'Bulk Quote Form' tab and drop your exact requirements. Our sales desks will send you custom pricing within 2 hours!";
      } else if (promptLower.includes("sample")) {
        responseText = "Yes! We offer free pre-production inventory samples. Shipping/courier charges are handled via DHL/FedEx. Give us your shipping address on the Contact info or through the Quote Form!";
      } else if (promptLower.includes("location") || promptLower.includes("address") || promptLower.includes("factory")) {
        responseText = "Our advanced manufacturing plant is located at: Yearpur, Sorkarbari Moor, Zirabo – 1341, Ashulia, Savar, Dhaka, Bangladesh. You are always welcome to visit us !";
      }

      return res.json({ text: responseText });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    res.json({ text: response.text || "I apologize, I am unable to process that request." });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Something went wrong in the assistant layer." });
  }
});

// Serve static assets and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
