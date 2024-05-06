import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const sbApiKey = import.meta.env.VITE_SUPABASE_API_KEY;
const sbUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL;

if (!sbApiKey || !sbUrl || !openAIApiKey) {
  throw new Error(
    "Supabase/OpenAI environment variables not set. Please set them in the .env file"
  );
}

const embeddings = new OpenAIEmbeddings({ openAIApiKey });

const supabaseClient = createClient(sbUrl, sbApiKey);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});

const retriever = vectorStore.asRetriever();

export { retriever };
