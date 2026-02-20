import { authService } from "./auth.service";

export interface Citation {
  id: string;
  documentName: string;
  pageNumber: number;
  sectionTitle: string;
}

export interface ContentBlock {
  type:
    | "answer"
    | "explanation"
    | "steps"
    | "key_points"
    | "example"
    | "code"
    | "warning"
    | "limitations"
    | "follow_up";
  title?: string;
  text?: string;
  list?: string[];
  steps?: { step: number; text: string }[];
}

export interface StructuredAnswer {
  intent: string;
  blocks: ContentBlock[];
  confidence: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | StructuredAnswer;
  citations?: Citation[];
  timestamp: string;
}

export interface ChatResponse {
  success: boolean;
  answer: string | StructuredAnswer;
  citations: Citation[];
}

export interface UploadPdfResponse {
  success: boolean;
  message: string;
  files: {
    id: string;
    name: string;
    status: string;
  }[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class ChatService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}/api/chat${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Chat service error:", error);
      throw error;
    }
  }

  async uploadPdfs(files: File[], chatId: string): Promise<UploadPdfResponse> {
    const url = `${API_BASE_URL}/api/chat/upload`;
    const formData = new FormData();
    files.forEach((file) => formData.append("pdfs", file));
    formData.append("chatId", chatId);

    const config: RequestInit = {
      method: "POST",
      body: formData,
      credentials: "include",
    };

    try {
      const response = await fetch(url, config);

      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(
              errorData.message ||
                `HTTP error! status: ${retryResponse.status}`,
            );
          }
          return await retryResponse.json();
        } catch (refreshError) {
          throw new Error("Access token required");
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("PDF upload error:", error);
      throw error;
    }
  }

  async createChat(chatId: string, title?: string): Promise<any> {
    return this.request("/", {
      method: "POST",
      body: JSON.stringify({ chatId, title }),
    });
  }

  async getChats(): Promise<any[]> {
    return this.request("/", {
      method: "GET",
    });
  }

  async updateChat(chatId: string, updates: any): Promise<any> {
    return this.request("/", {
      method: "PATCH",
      body: JSON.stringify({ chatId, ...updates }),
    });
  }

  async renameChat(chatId: string, title: string): Promise<any> {
    return this.request("/rename", {
      method: "PATCH",
      body: JSON.stringify({ chatId, title }),
    });
  }

  async deleteChat(chatId: string): Promise<any> {
    return this.request("/", {
      method: "DELETE",
      body: JSON.stringify({ chatId }),
    });
  }

  async getPdfs(chatId: string): Promise<any[]> {
    return this.request(`/pdfs/${chatId}`, {
      method: "GET",
    });
  }

  async getAllPdfs(): Promise<any[]> {
    return this.request("/all-pdfs", {
      method: "GET",
    });
  }

  async sendMessage(chatId: string, question: string): Promise<ChatResponse> {
    return this.request("/message", {
      method: "POST",
      body: JSON.stringify({ chatId, question }),
    });
  }

  private async refreshToken(): Promise<void> {
    await authService.refreshToken();
  }
}

export const chatService = new ChatService();
