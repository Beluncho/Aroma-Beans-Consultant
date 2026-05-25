export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string;
  link: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  recommendedProduct: Product | null;
}
