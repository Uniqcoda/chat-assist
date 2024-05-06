import { readFileSync } from "node:fs";
import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";

try {
  const text = readFileSync("utils/gym-faqs.txt", "utf8");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ["\n\n", "\n", " ", ""],
  });

  const output = await splitter.createDocuments([text]);

  const sbApiKey = process.env.VITE_SUPABASE_API_KEY;
  const sbUrl = process.env.VITE_SUPABASE_PROJECT_URL;
  const openAIApiKey = process.env.VITE_OPENAI_API_KEY;

  if (!sbApiKey || !sbUrl || !openAIApiKey) {
    throw new Error(
      "Supabase/OpenAI environment variables not set. Please set them in the .env file"
    );
  }

  const embeddings = new OpenAIEmbeddings({ openAIApiKey });
  const supabaseClient = createClient(sbUrl, sbApiKey);

  await SupabaseVectorStore.fromDocuments(output, embeddings, {
    client: supabaseClient,
    tableName: "documents",
    queryName: "match_documents",
  });
  console.log("Success!");
} catch (err) {
  console.log(err);
}
