export const serializeChatHistory = (chatHistory) => {
  return chatHistory
    .map((chatMessage) => {
      if (chatMessage._getType() === "human") {
        return `Human: ${chatMessage.content}`;
      } else if (chatMessage._getType() === "ai") {
        return `Assistant: ${chatMessage.content}`;
      } else {
        return `${chatMessage.content}`;
      }
    })
    .join("\n");
}
