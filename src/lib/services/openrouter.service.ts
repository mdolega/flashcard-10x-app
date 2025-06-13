import axios from "axios";
import type { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import type {
  OpenRouterConfig,
  GenerateChatParams,
  ChatMessage,
  ModelParams,
  OpenRouterRequestPayload,
  OpenRouterResponse,
  ResponseFormat,
} from "../../types";
import {
  ConfigurationError,
  AuthenticationError,
  RateLimitError,
  ServerError,
  NetworkError,
  SchemaValidationError,
} from "../../types";

export class OpenRouterService {
  private _httpClient: AxiosInstance;
  private _defaultSystemMessage?: string;

  public defaultModel: string;
  public defaultParams: ModelParams;

  constructor(private config: OpenRouterConfig) {
    // 1. Walidacja obecności apiKey
    if (!config.apiKey) {
      throw new ConfigurationError("API key is required");
    }

    // 2. Inicjalizacja domyślnych wartości
    this.defaultModel = config.defaultModel || "gpt-4o-mini";
    this.defaultParams = config.defaultParams || {
      temperature: 0.7,
      max_tokens: 150,
    };

    // 3. Inicjalizacja Axios z baseUrl i nagłówkiem Authorization
    this._httpClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000, // 20 seconds timeout
    });

    // 4. Dodanie interceptora do obsługi HTTP errorów
    this._setupInterceptors();
    this._setupRetryLogic();
  }

  /**
   * Generuje odpowiedź czatową używając OpenRouter API
   */
  public async generateChatCompletion(params: GenerateChatParams): Promise<ChatMessage[]> {
    try {
      const payload = this._buildRequestPayload(
        params.messages,
        params.model || this.defaultModel,
        params.params || this.defaultParams,
        params.responseFormat
      );

      const response = await this._httpClient.post<OpenRouterResponse>("/chat/completions", payload);

      return this._validateAndMap(response.data);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Ustawia globalny komunikat systemowy dla kolejnych wywołań
   */
  public setDefaultSystemMessage(message: string): void {
    this._defaultSystemMessage = message;
  }

  /**
   * Tworzy obiekt żądania zgodny z dokumentacją OpenRouter
   */
  private _buildRequestPayload(
    messages: ChatMessage[],
    model: string,
    params: ModelParams,
    responseFormat?: ResponseFormat
  ): OpenRouterRequestPayload {
    // Dodaj domyślny komunikat systemowy jeśli jest ustawiony i nie ma już komunikatu systemowego
    const finalMessages = [...messages];
    if (this._defaultSystemMessage && !messages.some((msg) => msg.role === "system")) {
      finalMessages.unshift({
        role: "system",
        content: this._defaultSystemMessage,
      });
    }

    const payload: OpenRouterRequestPayload = {
      model,
      messages: finalMessages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
    };

    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    return payload;
  }

  /**
   * Weryfikuje odpowiedź za pomocą Zod i mapuje na wewnętrzne typy
   */
  private _validateAndMap(response: OpenRouterResponse): ChatMessage[] {
    console.log("response", response);
    if (!response.choices || response.choices.length === 0) {
      throw new SchemaValidationError("No choices in response");
    }

    // Mapuj odpowiedzi z API na ChatMessage[]
    return response.choices.map((choice) => ({
      role: choice.message.role,
      content: choice.message.content,
    }));
  }

  /**
   * Rozpoznaje typ błędu i rzuca dedykowanymi wyjątkami
   */
  private _handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === "ECONNABORTED" || axiosError.code === "ENOTFOUND") {
        throw new NetworkError(`Network error: ${axiosError.message}`);
      }

      if (axiosError.response) {
        const status = axiosError.response.status;
        const responseData = axiosError.response.data as any;
        const message = responseData?.error?.message || axiosError.message;

        switch (status) {
          case 401:
            throw new AuthenticationError(`Authentication failed: ${message}`);
          case 429:
            const retryAfter = axiosError.response.headers["retry-after"];
            throw new RateLimitError(`Rate limit exceeded: ${message}`, retryAfter ? parseInt(retryAfter) : undefined);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new ServerError(`Server error: ${message}`, status);
          default:
            throw new ServerError(`HTTP error: ${message}`, status);
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new NetworkError(`Unknown error: ${errorMessage}`);
  }

  /**
   * Konfiguruje interceptory dla żądań i odpowiedzi
   */
  private _setupInterceptors(): void {
    // Request interceptor - logowanie żądań
    this._httpClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        console.log(`[OpenRouter] Making request to ${config.url}`, {
          method: config.method,
          url: config.url,
          timestamp: new Date().toISOString(),
        });
        return config;
      },
      (error: AxiosError) => {
        console.error("[OpenRouter] Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - logowanie odpowiedzi
    this._httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[OpenRouter] Response received`, {
          status: response.status,
          url: response.config.url,
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      (error: AxiosError) => {
        console.error("[OpenRouter] Response error:", {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Konfiguruje logikę ponownych prób
   */
  private _setupRetryLogic(): void {
    axiosRetry(this._httpClient, {
      retries: 3,
      retryDelay: (retryCount) => {
        return Math.pow(2, retryCount) * 1000; // Exponential backoff
      },
      retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status ? error.response.status >= 500 : false)
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(`[OpenRouter] Retry attempt ${retryCount} for ${requestConfig.url}`, {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      },
    });
  }
}
