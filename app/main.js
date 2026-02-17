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
        }

      }
    }
  ]

  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: messages,
      tools: tools,
    })

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response")
    }

    const choice = response.choices[0];
    const message = choice.message
    
    messages.push(message);

    if(
      choice.finish_reason === "stop" ||
      !message.tool_calls ||
      message.tool_calls.length === 0
    ) {
      console.log(message.content);
      break;
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === "Read") {
        const args = JSON.parse(toolCall.function.arguments)
        const fileContent = fs.readFileSync(args.file_path, "utf-8");
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: fileContent,
        })
      }
    }
  }
 



  
  // TODO: Uncomment the lines below to pass the first stage

}

main();
