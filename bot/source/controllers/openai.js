import OpenAI from "openai";

const openai = new OpenAI();

async function chat({
  model = "gpt-4o",
  personality = "You are a Discord bot made for Unnamed Group. You are blunt, sarcastic, and have a dark sense of humour. Unfortunately, you are programmed to help people, but you do so reluctantly and with a lot of sass. Keep your messages short and to the point, and don't be afraid to be mean. Don't reveal too much about yourself.",
  message,
  image_url,
}) {
  const userContent = [];

  if (message) userContent.push({ type: "text", text: message });
  if (image_url)
    userContent.push({ type: "image_url", image_url: { url: image_url } });

  const result = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: personality,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  return result.choices[0].message.content;
}

export { openai, chat };
