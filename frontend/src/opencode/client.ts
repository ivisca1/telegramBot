import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"

// Use import.meta.env.VITE_OPENCODE_API_KEY in production
const API_KEY = "<API_KEY_PLACEHOLDER>"

export const opencodeClient = createOpencodeClient({
  baseUrl: "http://localhost:4098",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
  },
})
