import { useState, useEffect, useRef } from "react";
import { 
  Coffee, 
  Send, 
  User, 
  CheckCircle, 
  ArrowRight, 
  HelpCircle, 
  Package, 
  CreditCard, 
  Truck, 
  Settings,
  Star,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Message, Product, ChatResponse } from "./types";

const CATEGORIES = [
  { id: "flavor", label: "Вкус и подбор", icon: Coffee, question: "Подберите кофе под мои вкусы" },
  { id: "grind", label: "Помол", icon: Settings, question: "Какой помол выбрать для моего способа заварки?" },
  { id: "subscription", label: "Подписка", icon: CheckCircle, question: "Как оформить подписку на кофе?" },
  { id: "storage", label: "Хранение", icon: Package, question: "Как правильно хранить зерновой кофе?" },
  { id: "delivery", label: "Доставка и оплата", icon: Truck, question: "Какие у вас условия доставки и оплаты?" },
  { id: "equipment", label: "Оборудование", icon: CreditCard, question: "Какое оборудование вы посоветуете для дома?" },
];

const SUGGESTIONS = [
  "Какой кофе посоветуете?",
  "Как оформить подписку?",
  "Какой помол для турки?"
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Здравствуйте! Я Ассистент Арома. С радостью помогу Вам выбрать идеальный кофе или отвечу на любые вопросы о нашем магазине. С чего начнем?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [recommendedProduct, setRecommendedProduct] = useState<Product | null>(null);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial data
    fetch("/api/initial-data")
      .then(res => res.json())
      .then(data => {
        if (data.products && data.products.length > 0) {
          setPopularProducts(data.products);
          setRecommendedProduct(data.products[0]);
        }
      })
      .catch(err => console.error("Error loading initial data:", err));
  }, []);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "API error");
      }

      const data: ChatResponse = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      
      if (data.recommendedProduct) {
        setRecommendedProduct(data.recommendedProduct);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Извините, произошла ошибка: ${error.message}. Пожалуйста, попробуйте позже.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    handleSend(cat.question);
    setIsMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-coffee-cream font-sans transition-all duration-300 min-h-0">
      
      {/* Mobile Header (Hide on md and up) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-coffee-dark text-coffee-cream z-50 shadow-lg border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-coffee-accent rounded-lg shadow-inner">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Aroma Beans</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95 text-white"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Overlay for mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Zone 1: Categories Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 
        w-72 md:w-96 lg:w-72 
        bg-coffee-dark text-coffee-cream 
        flex flex-col border-r border-coffee-dark/20 shadow-2xl md:shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Sidebar Header (Visible on Tablet/Desktop) */}
        <div className="hidden md:flex p-6 border-b border-white/10 items-center gap-3">
          <div className="p-2 bg-coffee-accent rounded-lg">
            <Coffee className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Aroma Beans</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-4 space-y-4 md:space-y-6 lg:space-y-4">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-coffee-cream/50">Категории</p>
          
          <div className="flex flex-col md:grid md:grid-cols-3 lg:flex lg:flex-col gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeCategory === cat.id 
                    ? "bg-coffee-accent text-white shadow-lg scale-102" 
                    : "hover:bg-white/5 text-coffee-cream/80 hover:text-white"
                }`}
              >
                <cat.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${activeCategory === cat.id ? "text-white" : "text-coffee-accent"}`} />
                <span className="text-sm md:text-xs lg:text-sm font-medium text-left line-clamp-1">{cat.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        <div className="hidden md:block p-6 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 opacity-80">
            <div className="w-8 h-8 rounded-full bg-coffee-accent flex items-center justify-center text-xs font-bold">AB</div>
            <div className="text-xs">
              <p className="font-semibold text-white">Семейная обжарка</p>
              <p className="opacity-60 text-[10px]">Aroma Beans © 2026</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Wrapper (Zone 2 & 3) */}
      <div className="flex-1 flex flex-col overflow-y-auto md:overflow-hidden lg:flex-row min-h-0">
        
        {/* Zone 2: Chat Area */}
        <main className="flex-shrink-0 md:flex-1 flex flex-col min-w-0 bg-white/40 relative h-[60vh] md:h-auto md:min-h-0 lg:h-full">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 md:gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md ${
                    msg.role === "assistant" 
                      ? "bg-coffee-dark text-coffee-cream" 
                      : "bg-coffee-accent text-white"
                  }`}>
                    {msg.role === "assistant" ? <Coffee className="w-4 h-4 md:w-5 md:h-5" /> : <User className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  
                  <div className={`max-w-[90%] md:max-w-[80%] lg:max-w-[70%] p-3 md:p-4 rounded-2xl shadow-sm ${
                    msg.role === "assistant"
                      ? "bg-white text-coffee-dark rounded-tl-none border border-coffee-dark/5"
                      : "bg-coffee-accent text-white rounded-tr-none"
                  }`}>
                    <div className="text-xs md:text-sm lg:text-base whitespace-pre-wrap leading-relaxed markdown-body">
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-coffee-dark text-coffee-cream flex items-center justify-center animate-pulse">
                  <Coffee className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-coffee-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-coffee-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-coffee-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 lg:p-6 bg-white/80 backdrop-blur-md border-t border-coffee-dark/10">
            <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-[10px] md:text-xs px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-coffee-dark/10 hover:border-coffee-accent hover:text-coffee-accent transition-colors bg-white shadow-sm whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите Ваш вопрос..."
                  className="w-full pl-4 md:pl-6 pr-14 md:pr-16 py-3 md:py-4 text-sm md:text-base bg-white border border-coffee-dark/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coffee-accent/20 focus:border-coffee-accent transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-2 md:p-3 bg-coffee-accent text-white rounded-xl hover:bg-coffee-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* Zone 3: Recommendation sidebar/footer */}
        <aside className="w-full lg:w-80 bg-white p-4 md:p-6 overflow-y-visible md:overflow-y-auto border-t md:border-t-0 lg:border-l border-coffee-dark/10 flex flex-col gap-6 scrollbar-hide flex-shrink-0">
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 text-coffee-dark/40 uppercase tracking-widest text-[9px] md:text-[10px] font-bold">
              <Star className="w-3 h-3 fill-current" />
              <span>Рекомендация для Вас</span>
            </div>

            <AnimatePresence mode="wait">
              {recommendedProduct ? (
                <motion.div
                  key={recommendedProduct.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative md:flex lg:flex-col md:gap-4 lg:gap-0"
                >
                  <div className="aspect-square w-full md:w-32 lg:w-full rounded-2xl md:rounded-3xl bg-coffee-cream overflow-hidden border border-coffee-dark/5 shadow-inner relative flex-shrink-0">
                    {recommendedProduct.imageUrl ? (
                      <img 
                        src={recommendedProduct.imageUrl} 
                        alt={recommendedProduct.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Coffee className="w-12 md:w-20 h-12 md:h-20 text-coffee-dark/10" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 px-2 py-0.5 md:px-3 md:py-1 bg-white/90 backdrop-blur rounded-full text-[10px] md:text-xs font-bold text-coffee-accent shadow-sm border border-coffee-dark/5">
                      {recommendedProduct.price}
                    </div>
                  </div>

                  <div className="mt-3 md:mt-0 lg:mt-5 flex-1 space-y-1.5 md:space-y-2">
                    <span className="text-[9px] md:text-[10px] font-bold text-coffee-accent uppercase tracking-tighter bg-coffee-accent/10 px-2 py-0.5 rounded inline-block">
                      {recommendedProduct.category}
                    </span>
                    <h3 className="text-lg md:text-base lg:text-xl font-bold text-coffee-dark leading-tight line-clamp-1 md:line-clamp-2">{recommendedProduct.name}</h3>
                    <p className="text-[11px] md:text-xs lg:text-sm text-coffee-dark/70 leading-relaxed line-clamp-2 md:line-clamp-3">
                      {recommendedProduct.description}
                    </p>
                  </div>

                  <div className="mt-4 md:mt-0 lg:mt-6 flex flex-row md:flex-col lg:flex-col gap-2 md:justify-center flex-shrink-0">
                    <button className="flex-1 md:flex-none md:px-4 py-2.5 md:py-3 lg:py-4 bg-coffee-dark text-white rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-coffee-dark/95 transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 group/btn">
                      В корзину
                      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                    <button className="flex-1 md:flex-none md:px-4 py-2.5 md:py-3 lg:py-4 bg-white text-coffee-dark border border-coffee-dark/10 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-coffee-cream/50 transition-all active:scale-98">
                      Подробнее
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-10 md:py-20 flex flex-col items-center justify-center text-center opacity-30 select-none">
                  <Package className="w-12 h-12 md:w-16 md:h-16 mb-4" />
                  <p className="text-[10px] md:text-xs font-medium uppercase tracking-tight">Подбираем товар...</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Support Card - hidden on md, visible on lg or mobile */}
          <div className="mt-auto hidden lg:block p-5 rounded-2xl bg-coffee-cream/50 border border-coffee-dark/5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-coffee-dark/10">
                <HelpCircle className="w-4 h-4 text-coffee-dark" />
              </div>
              <p className="text-xs font-bold text-coffee-dark/60">Нужна помощь?</p>
            </div>
            <p className="text-[11px] leading-relaxed text-coffee-dark/50">
              Наши эксперты всегда готовы проконсультировать Вас.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
