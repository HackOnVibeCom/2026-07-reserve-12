const API_KEY = "AQ." + "Ab8RN6JEQU7MnlCATOAoz4CB8W91JuPUuKFDcvSsPCRGxzjjXQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function callGemini(systemPrompt, userPrompt, maxTokens = 1500) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw { status: response.status, message: err.error?.message };
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) throw new Error("Empty response from Gemini");

  // Clean and parse JSON safely
  const clean = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function fetchPositioning(formData) {
  const systemPrompt = `You are a world-class mobile app positioning strategist. Analyze the app details provided and return ONLY a valid JSON object — no markdown, no backticks, no explanation. Raw JSON only.

Return exactly this shape:
{
  "oneliners": [
    { "text": "one-liner under 15 words", "angle": "Benefit-led" },
    { "text": "one-liner under 15 words", "angle": "Problem-first" },
    { "text": "one-liner under 15 words", "angle": "Audience-first" },
    { "text": "one-liner under 15 words", "angle": "Outcome-focused" },
    { "text": "one-liner under 15 words", "angle": "Emotion-led" }
  ],
  "app_store_subtitle": "Under 30 characters exactly",
  "positioning_tip": "One honest sentence about which one-liner is strongest and why",
  "suggested_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "target_subreddits": ["r/sub1", "r/sub2", "r/sub3"]
}

Rules:
- Every one-liner must be specific to THIS app, under 15 words
- No one-liner starts with Introducing, Meet, The app that, or A new way to
- App Store subtitle MUST be under 30 characters including spaces
- Keywords should be real ASO search terms
- Subreddits should match the app category and audience specifically`;

  const userPrompt = `App Name: ${formData.appName}
Category: ${formData.category}
Description: ${formData.description}
Target Audience: ${formData.audience}
Problem Solved: ${formData.problem}
Key Differentiator: ${formData.differentiator}
Tone of Voice: ${formData.tone}
Platforms: ${formData.platforms.join(', ')}
Price Model: ${formData.priceModel}
Launch Stage: ${formData.launchStage}`;

  return await callGemini(systemPrompt, userPrompt, 1000);
}

async function fetchPromoKit(lockedPositioning, formData) {
  const systemPrompt = `You are a world-class app marketing copywriter. Write a complete promotional copy kit for a mobile app using the founder's locked positioning message. Return ONLY a valid JSON object — no markdown, no backticks, no explanation. Raw JSON only.

Return exactly this shape:
{
  "app_store_description": "150-170 words. Hook sentence. 3 feature paragraphs. CTA. Paragraph breaks with \\n\\n.",
  "tweets": [
    { "text": "Launch announcement, under 240 chars, no hashtags", "style": "Launch Day" },
    { "text": "Problem/solution angle, under 240 chars", "style": "Problem/Solution" },
    { "text": "Social proof angle, under 240 chars", "style": "Social Proof" },
    { "text": "Feature highlight, under 240 chars", "style": "Feature Highlight" },
    { "text": "Founder story, honest and human, under 240 chars", "style": "Founder Story" }
  ],
  "reddit_post": {
    "title": "Honest specific title, r/SideProject style, no clickbait",
    "body": "130-150 words, conversational, real story, ends with genuine question"
  },
  "product_hunt_tagline": "Under 60 chars, no emoji, strong verb first, punchy",
  "linkedin_post": "110-130 words, professional but human, ends with a question",
  "email_subject_lines": [
    "Curiosity-driven subject line",
    "Benefit-driven subject line",
    "Personal/direct subject line"
  ],
  "press_hook": "60-80 words, TechCrunch opening paragraph style, third person, specific and newsworthy"
}

Every piece must feel written specifically for THIS app. No generic filler. Use the app name naturally.`;

  const userPrompt = `Core positioning message (locked): "${lockedPositioning}"

App Name: ${formData.appName}
Category: ${formData.category}
Target Audience: ${formData.audience}
Problem Solved: ${formData.problem}
Key Differentiator: ${formData.differentiator}
Tone: ${formData.tone}
Platforms: ${formData.platforms.join(', ')}
Price Model: ${formData.priceModel}
Launch Stage: ${formData.launchStage}`;

  return await callGemini(systemPrompt, userPrompt, 1500);
}
