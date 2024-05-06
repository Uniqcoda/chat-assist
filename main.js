import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { BufferMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { retriever } from "/utils/retriever";
import { serializeChatHistory } from "/utils/serializeChatHistory";

// Add an event listener to the DOM
document.addEventListener("submit", (e) => {
  e.preventDefault();
  runConversation();
});

const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;

const memory = new BufferMemory({
  memoryKey: "chatHistory",
  inputKey: "question", // The key for the input to the chain
  outputKey: "text", // The key for the final conversational output of the chain
  returnMessages: true, // If using with a chat model (e.g. gpt-3.5 or gpt-4)
});

/**
 * Create two prompt templates, one for generating questions and one for
 * answering questions.
 */
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  `Given the following chat history (if any) and a follow up question, rephrase the follow up question to be a standalone question that was asked by the user.
----------
CHAT HISTORY: {chatHistory}
----------
FOLLOWUP QUESTION: {question}
----------
Standalone question:`
);

const answerPrompt = PromptTemplate.fromTemplate(
  `You are a helpful and enthusiastic support bot who can answer a given question about a fitness company based on the context provided and the chat history. Try to find the answer in the context. If the answer is not given in the context, find the answer in the chat history if possible. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the user to email aswesomegym@sample.com. Don't try to make up an answer. Always speak as if you were chatting with a friend and you don't need to tell them where you got your response from.
----------
CONTEXT: {retrievedContext}
----------
CHAT HISTORY: {chatHistory}
----------
QUESTION: {question}
----------
Helpful Answer:`
);

// Initialize fast and slow LLMs, along with chains for each
const fasterModel = new ChatOpenAI({ openAIApiKey, model: "gpt-3.5-turbo" });
const questionChain = new LLMChain({
  llm: fasterModel,
  prompt: standaloneQuestionPrompt,
});

const slowerModel = new ChatOpenAI({ openAIApiKey, model: "gpt-4" });
const answerChain = new LLMChain({ llm: slowerModel, prompt: answerPrompt });

const performQuestionAnswering = async ({
  question,
  retrievedContext,
  chatHistory,
}) => {
  // 1. Generate the standalone question
  const chatHistoryString = chatHistory
  ? serializeChatHistory(chatHistory)
  : null;
  
  const { text } = await questionChain.invoke({
    chatHistory: chatHistoryString ?? "",
    question: question,
  });
  
  
  const standaloneQuestion = text;  
  // 2. Generate the answer
  const serializedContext = formatDocumentsAsString(retrievedContext);
  const response = await answerChain.invoke({
    chatHistory: chatHistoryString ?? "",
    retrievedContext: serializedContext,
    question: standaloneQuestion,
  });

  // 3. Save the chat history to memory
  await memory.saveContext({ question }, { text: response.text });

  return { result: response.text };
};

const chain = RunnableSequence.from([
  {
    // Pipe the question through unchanged
    question: (input) => input.question,
    // Fetch the chat history, and return the history or null if not present
    chatHistory: async () => {
      const savedMemory = await memory.loadMemoryVariables({});
      const hasHistory = savedMemory.chatHistory.length > 0;
      return hasHistory ? savedMemory.chatHistory : null;
    },
    // Fetch relevant context based on the question
    retrievedContext: async (input) =>
      retriever.getRelevantDocuments(input.question),
  },
  performQuestionAnswering,
]);

//
const runConversation = async () => {
  const userInput = document.getElementById("user-input");
  const question = userInput.value;
  userInput.value = "";

  const chatbotConversation = document.getElementById(
    "chatbot-conversation-container"
  );

  // add human message
  const newHumanSpeechBubble = document.createElement("div");
  newHumanSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newHumanSpeechBubble);
  newHumanSpeechBubble.textContent = question;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

  const input = { question };
  const { result } = await chain.invoke(input);

  // add AI message
  const newAiSpeechBubble = document.createElement("div");
  newAiSpeechBubble.classList.add("speech", "speech-ai");
  chatbotConversation.appendChild(newAiSpeechBubble);
  newAiSpeechBubble.textContent = result;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
};
