import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"

// Use import.meta.env.VITE_OPENCODE_API_KEY in production
const API_KEY = "sk-6UAua9ydUkK8fwusgtaWT9cEOBwpSY7xlOD57YpPxz8jINGRs25hLoOs4AqXXDuf"

export const opencodeClient = createOpencodeClient({
  baseUrl: "http://localhost:4098",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
  },
})
