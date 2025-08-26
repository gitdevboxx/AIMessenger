async function chat() {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `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`,
      "OpenAI-Project": "proj_pwfmAzhaxi8Sa4t1w1dbMLMj",
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