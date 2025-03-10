import {
  Content,
  GoogleGenerativeAI,
  Part,
  SchemaType,
} from '@google/generative-ai';
import { z } from 'zod';

import { env } from '../env';
import { PlayerResponse } from '../clocktower/types';

export const aiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const responseSchema = z
  .object({
    reasoning: z.string().min(1),
    action: z.string().min(1),
    message: z.string().optional(),
    players: z.array(z.string()).optional(),
  })
  .strict();

export const generateResponse = async (
  systemInstruction: string,
  history: Content[],
  message: string | Part[],
  allowedActions: string[],
  attempt = 0,
  maxAttempts = 2
): Promise<PlayerResponse> => {
  try {
    const aiModel = aiClient.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
    });

    const chatSession = aiModel.startChat({
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            reasoning: {
              type: SchemaType.STRING,
            },
            action: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: allowedActions,
            },
            message: {
              type: SchemaType.STRING,
            },
            players: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ['action', 'reasoning'],
        },
      },
      history: history,
    });

    const generationResult = await chatSession.sendMessage(message);
    const responseText = generationResult.response.text();

    const parsedResponse = JSON.parse(responseText);
    const validatedResponse = responseSchema.parse(parsedResponse);

    if (!allowedActions.includes(validatedResponse.action)) {
      throw new Error(
        `Invalid action: ${parsedResponse.action} [${allowedActions.join(
          ', '
        )}]`
      );
    }

    return validatedResponse;
  } catch (err: any) {
    const shouldRetry = attempt <= maxAttempts;
    console.error(
      `Failed to parse LLM response after ${attempt} attempts! ${
        shouldRetry ? 'Retrying...' : 'Giving up!'
      }`,
      err
    );

    if (shouldRetry) {
      return generateResponse(
        systemInstruction,
        history,
        message,
        allowedActions,
        attempt + 1,
        maxAttempts
      );
    }

    throw new Error(`Failed to generate a response after ${attempt} attempts!`);
  }
};
