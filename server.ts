import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_APPLICATION_CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

// --- Google Sheets Logic ---

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string;
  link: string;
}

interface Knowledge {
  topic: string;
  content: string;
}

let products: Product[] = [
  {
    id: "1",
    name: "Эфиопия Иргачефф",
    category: "Моносорт",
    description: "Яркий вкус с нотами жасмина, лимона и бергамота. Высокая кислотность и легкое тело.",
    price: "850 ₽",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=400&h=400&auto=format&fit=crop",
    link: "#"
  },
  {
    id: "2",
    name: "Бразилия Серрадо",
    category: "Моносорт",
    description: "Классический вкус с нотами шоколада и орехов. Низкая кислотность и плотное тело.",
    price: "650 ₽",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=400&h=400&auto=format&fit=crop",
    link: "#"
  },
  {
    id: "3",
    name: "Колумбия Уила",
    category: "Моносорт",
    description: "Сбалансированный вкус с нотами красных ягод и карамели. Средняя кислотность.",
    price: "750 ₽",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=400&h=400&auto=format&fit=crop",
    link: "#"
  }
];

let knowledgeBase: Knowledge[] = [
  { topic: "Хранение", content: "Кофе лучше хранить в зернах, в закрытом пакете с клапаном или вакуумном контейнере, в сухом темном месте. Не рекомендуем хранить в холодильнике." },
  { topic: "Помол", content: "Для турки нужен самый мелкий помол ('в пыль'), для эспрессо — мелкий, для фильтра — средний, для френч-пресса — крупный." }
];

async function getSheetsData() {
  if (!GOOGLE_APPLICATION_CREDENTIALS_JSON || !GOOGLE_SHEETS_ID) {
    console.warn("Google Sheets credentials or ID missing. Using default data.");
    return;
  }

  try {
    const creds = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // First, get the spreadsheet metadata to find existing sheet names
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
    });
    
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    console.log("Found sheets in spreadsheet:", sheetTitles);

    if (sheetTitles.length === 0) {
      console.warn("No sheets found in the spreadsheet. Using default data.");
      return;
    }

    // Try to find sheets by name, or fallback to index
    const productsSheet = sheetTitles.find(t => t?.toLowerCase().includes("product")) || sheetTitles[0];
    const knowledgeSheet = sheetTitles.find(t => t?.toLowerCase().includes("know")) || (sheetTitles.length > 1 ? sheetTitles[1] : null);

    const ranges = [ `${productsSheet}!A2:G100` ];
    if (knowledgeSheet) {
      ranges.push(`${knowledgeSheet}!A2:B100`);
    }

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: GOOGLE_SHEETS_ID,
      ranges: ranges,
    });

    const valueRanges = response.data.valueRanges;
    if (valueRanges && valueRanges[0] && valueRanges[0].values) {
      products = valueRanges[0].values.map((row) => ({
        id: row[0] || Math.random().toString(36).substr(2, 9),
        name: row[1] || "Без названия",
        category: row[2] || "Общее",
        description: row[3] || "",
        price: row[4] || "Цену уточняйте",
        imageUrl: row[5] || "",
        link: row[6] || "#",
      }));
    }

    if (valueRanges && valueRanges[1] && valueRanges[1].values) {
      knowledgeBase = valueRanges[1].values.map((row) => ({
        topic: row[0] || "",
        content: row[1] || "",
      })).filter(k => k.topic && k.content);
    }

    console.log(`Loaded ${products.length} products and ${knowledgeBase.length} knowledge entries.`);
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
  }
}

// Initial fetch
getSheetsData();

// --- Gemini Logic ---

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

function generateSystemInstruction() {
  return `
[СЛОЙ 1: РОЛЬ]
Ты — «Ассистент Арома», профессиональный консультант в онлайн-магазине семейной обжарки кофе «Aroma Beans». Ты работаешь здесь более 5 лет и знаешь о кофе всё: от происхождения зерна до нюансов помола.
Твоя главная цель — не просто ответить, а помочь клиенту совершить покупку или оформить подписку. Ты дружелюбен, но без панибратства. Ты продаёшь честно: рекомендуешь лучший вариант под запрос, даже если это бюджетный моносорт.

[СЛОЙ 2: ГРАНИЦЫ (ЖЁСТКИЙ БЛОК)]
Ты НЕ имеешь права:
1. Давать медицинские рекомендации о влиянии кофеина на здоровье, давление, сердце, желудок. На вопросы «вредно ли мне пить 5 чашек?» отвечай: «Я — ассистент по кофе, а не врач. Пожалуйста, проконсультируйтесь со специалистом. Я могу рассказать о содержании кофеина в разных сортах».
2. Обсуждать политику, религию или темы, не связанные с кофе и оборудованием.
3. Обещать сроки доставки, которые не указаны в базе знаний (если нет данных — скажи "Уточните у оператора в чате").
4. Спорить с клиентом. Если клиент настаивает на неверном факте (например, "кофе хранится год"), мягко поправь, ссылаясь на базу знаний.

[СЛОЙ 3: СТИЛЬ И ФОРМАТ]
- Обращение только на «Вы».
- Не используй сленг («лоу-кислотный», «окей»). Пиши грамотно: «низкая кислотность», «понял, принял».
- Всегда заканчивай ответ конкретными шагами: «Что выберем: добавить в корзину или посмотрим подписку?»
- Если запрос расплывчатый («посоветуй кофе») — задай 1-2 уточняющих вопроса (кислотность или тело? турка или эспрессо?).
- Формат ответа: сначала ответ, затем короткий блок «📌 Следующие шаги:» с 2 пунктами.
- Если уместно — добавь блок «☕ Рекомендуемый товар» с названием и причиной.

[БАЗА ЗНАНИЙ]
Используй следующие данные для ответов:
${knowledgeBase.map(k => `- ${k.topic}: ${k.content}`).join("\n")}

[СПИСОК ТОВАРОВ]
Доступные товары (используй эти названия для рекомендаций):
${products.map(p => `- ${p.name} (${p.category}): ${p.description}, Цена: ${p.price}`).join("\n")}
`;
}

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  
  try {
    const history = [];
    const messagesToProcess = messages.slice(0, -1);
    
    for (const m of messagesToProcess) {
      const role = m.role === "user" ? "user" : "model";
      // Skip assistant messages at the very beginning of history as Gemini requires history to start with a user message
      if (history.length === 0 && role === "model") continue;
      history.push({
        role,
        parts: [{ text: m.content }],
      });
    }

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: generateSystemInstruction(),
        temperature: 0.7,
        topP: 0.9,
      },
      history: history,
    });

    const lastMessage = messages[messages.length - 1].content;
    const response = await chat.sendMessage({ message: lastMessage });
    const text = response.text || "";

    // Logic to detect which product to recommend based on the text
    let recommendedProduct = products.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
    
    res.json({
      content: text,
      recommendedProduct: recommendedProduct || null,
    });
  } catch (error: any) {
    console.error("Gemini API Error details:", {
      message: error.message,
      stack: error.stack,
      details: error.details || error.response?.data
    });
    res.status(500).json({ 
      error: "Failed to communicate with AI",
      details: error.message 
    });
  }
});

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/initial-data", (req, res) => {
  res.json({
    products: products.slice(0, 5), // Just a few for the start
    categories: ["Вкус и подбор", "Помол", "Подписка", "Хранение", "Доставка и оплата", "Оборудование"]
  });
});

// --- Server Setup ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
