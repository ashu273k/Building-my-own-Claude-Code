import OpenAI from "openai";
import fs from "fs"; 

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  const response = await client.chat.completions.create({
    model: "anthropic/claude-haiku-4.5",
    messages: [
      { role: "user", content: prompt },
      {role: "user", content: "Summarize the README for me."},
      {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "function": {
              "name": "Read",
              "arguments": "{\"file_path\": \"./README.md\"}"
            }
          }
        ]
      }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "Read",
          description: "Read and return the contents of a file",
          parameters: {
            type: "object",
            properties: {
              file_path: {
                type: "string",
                description: "The path to the file to read",
              },
            },
            required: ["file_path"],
          },
        },
      },
    ],
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("no choices in response");
  }

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  // TODO: Uncomment the lines below to pass the first stage
  for (let i = 0; i < response.choices.length; i++) {

    const message = response.choices[i].message;
   
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === "Read") {
        const args = JSON.parse(toolCall.function.arguments);
        const fileContent = fs.readFileSync(args.file_path, "utf-8");
        console.log(fileContent);
      }
    } else {
      console.log(message.content);
    }
  }
}

main();
