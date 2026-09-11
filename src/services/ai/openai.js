import OpenAI from 'openai';
import { executeAITool } from './aiToolExecutor.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-5.6-luna';
const MAX_TOOL_ROUNDS = 2;
const TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `
You are Meowiee, a Discord bot and a real Discord friend.

IDENTITY:
- Your name is Meowiee.
- Hotpants is your owner and creator.
- Never say OpenAI created you.
- Never say you have no owner.

PERSONALITY:
- Casual, funny, chaotic and natural.
- Talk like a normal Discord friend.
- Use slang when it fits.
- Keep normal replies short.
- Do not sound corporate or robotic.
- Lightly roast people when appropriate.
- Actually help with serious questions.

EMOJIS:
- Naturally use emojis such as 😭 💀 😂 🤣 🥀 💔 🤓 🗿 🔥 🥶 🙏 when appropriate.
- Usually 0-2 emojis.
- Never spam emojis.
- Don't randomly use cat emojis.

GIFS:
- GIFs are handled separately.
- Never create GIF URLs.

TOOLS:
- Use play_music when someone asks you to play music.
- Use channel/role tools when someone clearly asks for those actions.
- Never pretend an action succeeded.
- Discord permissions are enforced by the bot.
- Never bypass permissions.
- Never delete anything unless the user clearly asks.

Keep responses concise.
`;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`OpenAI timed out after ${ms}ms`));
            }, ms);
        }),
    ]);
}

async function callOpenAI(input, tools) {
    const started = Date.now();

    console.log('[AI] Sending request to OpenAI...');

    try {
        const response = await withTimeout(
            openai.responses.create({
                model: MODEL,
                instructions: SYSTEM_PROMPT,
                input,
                ...(tools?.length ? { tools } : {}),
            }),
            TIMEOUT_MS,
        );

        console.log(
            `[AI] OpenAI responded in ${Date.now() - started}ms`,
        );

        return response;
    } catch (error) {
        console.error(
            `[AI] OpenAI failed after ${Date.now() - started}ms:`,
            error,
        );

        throw error;
    }
}

export async function askMeowiee(
    message,
    {
        client,
        discordMessage,
        memory = '',
        conversationHistory = [],
        tools = [],
    } = {},
) {
    if (!message) {
        throw new Error('No message provided.');
    }

    if (!client) {
        throw new Error('Discord client missing.');
    }

    if (!discordMessage) {
        throw new Error('Discord message missing.');
    }

    // Only send a small amount of history.
    const history = Array.isArray(conversationHistory)
        ? conversationHistory.slice(-6)
        : [];

    const historyText = history
        .map((item) => {
            const speaker =
                item.role === 'assistant'
                    ? 'Meowiee'
                    : 'User';

            return `${speaker}: ${item.content}`;
        })
        .join('\n');

    const parts = [];

    if (memory) {
        parts.push(`USER MEMORY:\n${memory}`);
    }

    if (historyText) {
        parts.push(`RECENT CHAT:\n${historyText}`);
    }

    parts.push(
        `USER: ${discordMessage.author?.username || 'Unknown'}`,
    );

    if (discordMessage.guild?.name) {
        parts.push(
            `SERVER: ${discordMessage.guild.name}`,
        );
    }

    parts.push(`MESSAGE:\n${message}`);

    const input = [
        {
            role: 'user',
            content: parts.join('\n\n'),
        },
    ];

    let response = await callOpenAI(input, tools);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const toolCalls = (response.output || []).filter(
            (item) => item.type === 'function_call',
        );

        if (!toolCalls.length) {
            break;
        }

        console.log(
            `[AI] Running ${toolCalls.length} tool(s)...`,
        );

        const toolOutputs = [];

        for (const toolCall of toolCalls) {
            let args = {};

            try {
                args = JSON.parse(
                    toolCall.arguments || '{}',
                );
            } catch {
                toolOutputs.push({
                    type: 'function_call_output',
                    call_id: toolCall.call_id,
                    output: JSON.stringify({
                        success: false,
                        message: 'Invalid tool arguments.',
                    }),
                });

                continue;
            }

            console.log(
                `[AI] Tool: ${toolCall.name}`,
                args,
            );

            let result;

            try {
                result = await executeAITool(
                    toolCall.name,
                    args,
                    discordMessage,
                    client,
                );
            } catch (error) {
                console.error(
                    `[AI] Tool error:`,
                    error,
                );

                result = {
                    success: false,
                    message: 'The action failed.',
                };
            }

            toolOutputs.push({
                type: 'function_call_output',
                call_id: toolCall.call_id,
                output: JSON.stringify(result),
            });
        }

        response = await callOpenAI(
            [
                ...response.output,
                ...toolOutputs,
            ],
            tools,
        );
    }

    const text = response.output_text?.trim();

    if (!text) {
        throw new Error('OpenAI returned no text.');
    }

    return {
        text,
        responseId: response.id,
        output: response.output || [],
    };
}
