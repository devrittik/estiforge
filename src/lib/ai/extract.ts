import { LlmError, type ChatMessage, type TextModel } from "@/lib/ai/provider";
import { parseModelJson, type RequirementSuggestion } from "@/lib/ai/extraction";
import { listCalculations } from "@/lib/calculations/registry";
import { electricalCatalogue } from "@/modules/electrical/catalogue";

const methods = listCalculations()
  .map((calculation) => `${calculation.id} ${calculation.version}: ${calculation.formula}`)
  .join("\n");

const catalogue = electricalCatalogue
  .map((item) => `${item.code} (${item.unit})`)
  .join(", ");

const systemPrompt = `You extract electrical estimate inputs. Return one JSON object and nothing else.
Supported catalogue codes: ${catalogue}.
Supported methods:
${methods}
Rules:
- Copy only counts and lengths the user stated. If a number is missing, use null and add a short entry to missing.
- Do not invent prices, rates, totals, tax, or engineering standards.
- Do not claim cable sizing, protection, earthing, load certification, or civil work is supported. Set supported to false and explain that in unsupportedReason.
- count is a whole number for nos items. length is metres for cable and conduit.
- explanation names only the supported methods above.`;

export async function extractRequirements(
  description: string,
  model: TextModel,
): Promise<
  | { ok: true; provider: TextModel["provider"]; suggestion: RequirementSuggestion }
  | { ok: false; provider: TextModel["provider"]; message: string }
> {
  const first = await ask(model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: description },
  ]);
  if (!first.ok && first.retryable) {
    const second = await ask(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
      { role: "user", content: `The previous JSON was rejected: ${first.message} Return corrected JSON only.` },
    ]);
    if (second.ok) {
      return { ok: true, provider: model.provider, suggestion: second.suggestion };
    }
    return {
      ok: false,
      provider: model.provider,
      message: second.message,
    };
  }
  if (!first.ok) {
    return { ok: false, provider: model.provider, message: first.message };
  }
  return { ok: true, provider: model.provider, suggestion: first.suggestion };
}

async function ask(
  model: TextModel,
  messages: ChatMessage[],
): Promise<
  | { ok: true; suggestion: RequirementSuggestion }
  | { ok: false; retryable: boolean; message: string }
> {
  try {
    const content = await model.complete(messages);
    const parsed = parseModelJson(content);
    if (!parsed.ok) {
      return { ok: false, retryable: true, message: parsed.message };
    }
    return parsed;
  } catch (error) {
    const message =
      error instanceof LlmError
        ? error.message
        : "The model could not be reached. Enter the quantities manually.";
    return { ok: false, retryable: false, message };
  }
}
