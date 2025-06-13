import type { AiLogStatus } from "../../types";
import { supabaseClient } from "../../db/supabase.client";
import type { Json } from "../../db/database.types";

export class AiLogService {
  private readonly supabase: typeof supabaseClient;

  constructor() {
    this.supabase = supabaseClient;
  }

  async createLog(params: {
    userId: string;
    prompt: string;
    model?: string;
    cost?: number;
    tokens?: number;
    status?: AiLogStatus;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from("ai_generations_logs")
      .insert({
        user_id: params.userId,
        prompt: params.prompt,
        model: params.model || "unknown",
        cost: params.cost || 0,
        tokens: params.tokens || 0,
        status: params.status || "success",
        response: {} as Json,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create AI generation log: ${error.message}`);
    }

    return data.id;
  }

  async updateLog(params: {
    id: string;
    response?: Json;
    model?: string;
    cost?: number;
    tokens?: number;
    status: AiLogStatus;
    statusCode?: number;
    errorMessage?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("ai_generations_logs")
      .update({
        response: params.response || ({} as Json),
        model: params.model,
        cost: params.cost,
        tokens: params.tokens,
        status: params.status,
        status_code: params.statusCode,
        error_message: params.errorMessage,
      })
      .eq("id", params.id);

    if (error) {
      throw new Error(`Failed to update AI generation log: ${error.message}`);
    }
  }
}
