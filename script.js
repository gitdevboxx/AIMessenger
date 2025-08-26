async function chat() {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `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`,
      "OpenAI-Project": "proj_YNhLZIqfzXfBTxpsgK4rRSP1",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // oder gpt-3.5-turbo, gpt-4o
      messages: [
        { role: "system", content: "Du bist ein hilfreicher Assistent." },
        { role: "user", content: "Erkläre mir Quantenphysik einfach." }
      ]
    }),
  });

  const data = await response.json();
  console.log(data.choices[0].message.content);
}

chat();