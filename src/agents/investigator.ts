import { Agent, run } from "@openai/agents";

const investigatorAgent = new Agent({
  name: "Investigator",
  instructions: "You answer history questions clearly and concisely.",
  model: "gpt-5.5",
});

export const investigate = async (question: string) => {
  const result = await run(investigatorAgent, question);
  return result;
};
