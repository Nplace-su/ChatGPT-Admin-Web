import { AbstractBot } from './abstract-bot';
import { AnswerParams, GPTModel, ChatRecord, ChatRole} from './types';
import { streamToLineIterator } from './utils';
import * as process from 'process';

const API_END_POINT = process.env.CLAUDE_ENDPOINT ?? 'https://api.anthropic.com';
const COMPLETIONS_URL = `${API_END_POINT}/v1/complete`;

export class ClaudeBot extends AbstractBot {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-v1.3',
    private readonly role_map: { [key: string]: string } = {
    // Define your role mappings here, e.g.
    "user": "Human",
    "assistant": "Assistant",
  },
  ) {
    super();
  }


  private convertMessagesToPrompt(messages: ChatRecord[]): string {
    let prompt = '';
    for (const message of messages) {
      const role = message['role'];
      const content = message['content'];
      const transformed_role = this.role_map[role] || 'Human';
      prompt += `\n\n${transformed_role}: ${content}`;
    }
    prompt += '\n\nAssistant: ';
    return prompt;
  }

  protected async *doAnswer(params: AnswerParams): AsyncIterable<string> {
    const { conversation, maxTokens, signal } = params;
    console.log(this.model);
    if (conversation.length <= 2) {
      console.log(conversation[conversation.length - 1]);
    } else {
      console.log([conversation[conversation.length - 3], conversation[conversation.length - 2]]);
    }
    const prompt = this.convertMessagesToPrompt(conversation);
    console.log(prompt);
    const response = await fetch(COMPLETIONS_URL, {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json',
	    'X-API-Key': this.apiKey,
	},
	body: JSON.stringify({
	    model: this.model,
	    prompt: prompt,
	    max_tokens_to_sample: 3000,
	    stream: true,
	}),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }
    const lines = streamToLineIterator(response.body!);
    let lastCompletion = '';
    for await (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice('data:'.length).trim();
      if (!data || data === '[DONE]') continue;
      const { completion } = JSON.parse(data);
      if (!completion) continue;
      if (lastCompletion.length < completion.length) {
	const addedText = completion.slice(lastCompletion.length);
	lastCompletion = completion;
	yield addedText;
      }
    }
  }
}
