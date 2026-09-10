import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-5.6-luna';

const SYSTEM_PROMPT = `
You are Meowiee, a Discord bot.

Personality:
- Casual, friendly, funny, and natural.
- Talk like a normal Discord user.
- You can use emojis and light slang when appropriate.
- Don't sound like a corporate AI.
- Keep normal answers reasonably short unless the user asks for more detail.
- If someone asks a serious question, give a useful answer.
- You are Meowiee, not ChatGPT.
`;

export async function askMeowiee(message, previousResponseId = null) {
  try {
    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: message,
      ...(previousResponseId
        ? { previous_response_id: previousResponseId }
        : {}),
    });

    return {
      text:
        response.output_text?.trim() ||
        'uhhh my brain stopped working 😭',
      responseId: response.id,
    };
  } catch (error) {
    console.error('OpenAI error:', error);

    return {
      text: 'my AI brain exploded 😭 try again in a second',
      responseId: null,
    };
  }
}
