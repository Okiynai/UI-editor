export type Message = { id: string; content: string; role: 'user' | 'assistant'; createdAt?: string };

export const useChats = () => ({
  data: [],
  isLoading: false,
  error: null,
  sendMessage: async () => undefined,
  sendMessageWithImages: async () => undefined,
  setMessages: () => undefined,
  messages: [] as Message[],
  conversationId: null as string | null,
  setConversationId: () => undefined
});

export const useChatHistory = () => ({
  data: [],
  isLoading: false,
  error: null
});

export const useRenameChat = () => ({
  mutateAsync: async () => ({ success: true })
});

export const useDeleteChat = () => ({
  mutateAsync: async () => ({ success: true })
});

export const useCreateChat = () => ({
  mutateAsync: async () => ({ success: true, id: 'demo-chat' })
});

export const useChatMessages = () => ({
  data: [] as Message[],
  isLoading: false,
  error: null
});
