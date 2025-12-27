export default function handler(req: any, res: any) {
  // Return the OpenAI domain verification token
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send("mj8fFoVA0Dfa2MTNOGd4DIYJ9sMcgZmfUKlvGxh5pwc");
}

