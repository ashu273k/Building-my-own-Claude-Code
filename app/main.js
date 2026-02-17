import OpenAI from "openai";
import fs from "fs";
import child_process from "child_process";

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

  const messages = [{ role: "user", content: prompt }];

  const tools = [
    {
      type: "function",
      function: {
        name: "Read",
        description: "Read and return the content of a file",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: " The path to the file to read",
            },
          },
          required: ["file_path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "Write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          required: ["file_path", "content"],
          properties: {
            file_path: {
              type: "string",
              description: " The path of the file to write to",
            },
            content: {
              type: "string",
              description: " The content to write to the file",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "Bash",
        description: "Execute a shell command",
        parameters: {
          type: "object",
          required: ["command"],
          properties: {
            command: {
              type: "string",
              description: "The command to execute",
            },
          },
        },
      },
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: messages,
      tools: tools,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const choice = response.choices[0];
    const message = choice.message;

    messages.push(message);

    if (
      choice.finish_reason === "stop" ||
      !message.tool_calls ||
      message.tool_calls.length === 0
    ) {
      console.log(message.content);
      break;
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === "Read") {
        const args = JSON.parse(toolCall.function.arguments);
        const fileContent = fs.readFileSync(args.file_path, "utf-8");
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: fileContent,
        });
      }
      if (toolCall.function.name === "Write") {
        const args = JSON.parse(toolCall.function.arguments);
        fs.writeFileSync(args.file_path, args.content);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Successfully wrote to file ${args.file_path}`,
        });
      }
      if (toolCall.function.name === "Bash") {
        const args = JSON.parse(toolCall.function.arguments);
        const execSync = child_process.execSync;
        try {
          const output = execSync(args.command, { encoding: "utf-8" });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: output,
          });
        } catch (error) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Error executing command: ${error.message}`,
          });
        }
      }
    }
  }

}

main();
