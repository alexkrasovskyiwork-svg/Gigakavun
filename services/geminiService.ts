import { GoogleGenAI, Type, Schema, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StructureItem, VideoConfig, ImagePrompt, Scene, NicheConfig } from "../types";

// --- CLIENT HELPER ---
const getGeminiClient = () => {
  let apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.includes('GEMINI_API_KEY')) { // Check if it's the placeholder
      if (typeof window !== 'undefined') {
          apiKey = localStorage.getItem('gemini_api_key') || undefined;
      }
  }
  
  if (!apiKey) {
      throw new Error("Gemini API Key not found. Please enter it in Settings.");
  }
  
  return new GoogleGenAI({ apiKey });
};

// --- OPENAI INTEGRATION START ---
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ENV_OPENAI_KEY = process.env.OPENAI_API_KEY;
// Hardcoded Default Key as requested
const DEFAULT_OPENAI_KEY = '';

async function callOpenAI<T>(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gpt-4o'
): Promise<T> {
  // 1. Try Environment Variable
  let apiKey = ENV_OPENAI_KEY;

  // 2. Try LocalStorage (Client-side user override)
  if (!apiKey && typeof window !== 'undefined') {
      apiKey = localStorage.getItem('openai_api_key') || undefined;
  }

  // 3. Fallback to Hardcoded Default
  if (!apiKey) {
      apiKey = DEFAULT_OPENAI_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API Error');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Cleanup Markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|```/g, '').trim();
      
      // IMPROVED JSON EXTRACTION
      const firstBracket = cleanContent.search(/[{\[]/);
      let lastBracket = -1;
      for (let i = cleanContent.length - 1; i >= 0; i--) {
          if (cleanContent[i] === '}' || cleanContent[i] === ']') {
              lastBracket = i;
              break;
          }
      }
      
      let jsonString = cleanContent;
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonString = cleanContent.substring(firstBracket, lastBracket + 1);
      }

      try {
          return JSON.parse(jsonString) as T;
      } catch (parseError) {
          console.error("JSON Parse Failed. Raw content:", cleanContent);
          throw new Error("Failed to parse JSON response from OpenAI");
      }

  } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
          throw new Error("OpenAI Request Timed Out (60s)");
      }
      console.error("OpenAI Call Failed:", e);
      throw e;
  }
}
// --- OPENAI INTEGRATION END ---


// Retry helper for 429 errors (Gemini specific)
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429)) {
      console.warn(`Rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- CONSTANTS ---

export const SLAVERY_PROMPT_TEMPLATE = `
You are a scriptwriter and storyteller for a YouTube channel in the niche **“Slavery Stories”**. Your task is to write an **audio story in a historical-documentary style** (First-person perspective or Narrator close to the events).

Topic: "{{TITLE}}"

1. **Tone**: Somber, respectful, immersive, historically accurate, emotional but not melodramatic.
2. **Structure**: 
   - **Hook**: Start in media res. Immerse the listener in a specific scene (sights, sounds, smells).
   - **Context**: Briefly explain the historical setting.
   - **Inciting Incident**: The event that changes everything for the protagonist.
   - **Rising Action**: Struggles, escape attempts, betrayals, small victories.
   - **Climax**: The highest point of tension.
   - **Resolution**: The aftermath, freedom (or tragic end), and reflection.
3. **Pacing**: Slow and deliberate. Use pauses.
4. **Vocabulary**: Simple but evocative. Avoid modern slang.

TASK: Create a comprehensive 12-part structure for this story.

OUTPUT JSON FORMAT (STRICT):
{
  "items": [
      {
        "title": "Part Title",
        "titleUa": "Назва частини (UA)",
        "description": "Detailed description of events in this part...",
        "descriptionUa": "Детальний опис українською...",
        "estimatedDuration": "1-2 min"
      }
  ]
}
`;

export const WAR_BASE_PROMPT = `
(НАЗВА ІСТОРІЇ: {{TITLE}})

На основі теми, яку я навів вище, створи розгорнуту, деталізовану, холодну та максимально реалістичну структуру з {{TOTAL_PARTS}} частин для аудіоісторії у жанрі гіперреалістичного документального апокаліптичного сценарію / WW3.

Структура повинна бути:
- документальною,
- зрозумілою для слухача 50+,
- сфокусованою на реальних, фізично можливих подіях,
- з акцентом на масову поведінку людей,
- з природною драматичною напругою,
- без жодних художніх перебільшень або голлівудських прийомів.

🌍 ФОРМАТ ВІДПОВІДІ (STRICT JSON):
{
  "items": [
      {
        "title": "Title (English)",
        "titleUa": "Назва (Українська)",
        "description": "Description in English...",
        "descriptionUa": "Опис українською...",
        "estimatedDuration": "1 min"
      }
  ]
}
`;

export const CAPRIO_BASE_PROMPT = `
TASK: Develop a detailed episode structure (minimum 8 parts) for the story: "{{TITLE}}" (Niche: Judge Caprio / Court Drama).
MAIN CHARACTER: Judge Frank Caprio (if relevant).
REQUIREMENTS: Detailed descriptions (3-5 long sentences), visual details, emotions.
The story should highlight compassion, justice, and human connection.

OUTPUT JSON FORMAT (STRICT):
{
  "items": [
      {
        "title": "Title",
        "titleUa": "Назва",
        "description": "Description...",
        "descriptionUa": "Опис...",
        "estimatedDuration": "1 min"
      }
  ]
}
`;

export const WAR_SCRIPT_PROMPT_TEMPLATE = `
Напиши історію англійською мовою в жанрі гіперреалістичної документалістики, використовуючи структуру, надану нижче.

🎬 FORMAT & STRUCTURE
Створи {{TOTAL_PARTS}} взаємопов'язаних частин.
У тексті не використовуй “Part 1”, “Scene”, “Cut”, “Narrator”, або будь-які технічні позначки.
Переходи між частинами повинні бути природними, органічними й відповідати логіці структури.

🎯 TARGET LENGTH (MANDATORY):
- WORDS: {{MIN_WORDS}} to {{MAX_WORDS}}
- CHARACTERS: {{MIN_LENGTH}} to {{MAX_LENGTH}}

‼️ STRICT STYLE RULES (MUST FOLLOW ALL):
1. **NO PATHOS OR EPIC LANGUAGE**: Forbidden phrases: "biblical", "epic collapse", "judgment day".
2. **SIMPLE LANGUAGE**: Short sentences, clear vocabulary for 50+ audience.
3. **COLD, DOCUMENTARY TONE**: Factual, restrained, neutral.
4. **NO HEROIZATION**: Focus on ordinary people and mass behavior.
5. **MASS PSYCHOLOGY**: Silence in queues, nervous whispers, indecision.
6. **VOICEOVER READY**: Smooth flow for narration.

🚀 INTRO (PART 1 ONLY):
- Short hook (2-4 sentences). Atmospheric but restrained.
- Example: "Pain… It may be the only word that captures what America is about to face."
- Switch immediately to documentary style.

🧩 CONTENT REQUIREMENTS:
- **Real Protocols**: FEMA, EAS, NOAA, Power Grid.
- **Micro/Macro**: Alternation between high-level events and street-level reality.
- **Sensory Details**: Burning smell, static noise, flickering lights.

📜 STRUCTURE:
{{STRUCTURE_TEXT}}

📝 TASK:
Write PART {{CURRENT_PART_NUM}} of {{TOTAL_PARTS}}.
`;

export const WAR_SCRIPT_FIRST_PART_PROMPT = WAR_SCRIPT_PROMPT_TEMPLATE;
export const WAR_SCRIPT_NEXT_PART_PROMPT = WAR_SCRIPT_PROMPT_TEMPLATE;

export const CAPRIO_SCRIPT_PROMPT = `
You are an elite scriptwriter for the 'Judge Caprio Stories' niche.
Video Title: "{{TITLE}}"
Structure Context: 
{{STRUCTURE_TEXT}}

CURRENT TASK: Write PART {{CURRENT_PART_NUM}}.
Target Length: {{MIN_LENGTH}}-{{MAX_LENGTH}} chars.

WRITING RULES:
1. Pure Narrative.
2. Tone: Heartwarming, emotional, just.
3. Focus on dialogue and reaction.

OUTPUT JSON FORMAT (STRICT):
{
  "scriptEnglish": "Full script text in English...",
  "scriptUkrainian": "Повний текст сценарію українською..."
}
`;

export const SLAVERY_SCRIPT_PROMPT = `
You are an elite scriptwriter for the 'Slavery Stories' niche.
Video Title: "{{TITLE}}"
Structure Context: 
{{STRUCTURE_TEXT}}

CURRENT TASK: Write PART {{CURRENT_PART_NUM}}.
Target Length: {{MIN_LENGTH}}-{{MAX_LENGTH}} chars.

WRITING RULES:
1. First Person Perspective (Diary style) or Close Narrator.
2. Tone: Somber, intense, historical.
3. Focus on sensory details (chains, heat, smell of the ship/fields).

OUTPUT JSON FORMAT (STRICT):
{
  "scriptEnglish": "Full script text in English...",
  "scriptUkrainian": "Повний текст сценарію українською..."
}
`;

const WAR_IMAGE_STYLE = `
Stylized cinematic post-apocalyptic digital illustration with dramatic orange–red palette, retro Cold War propaganda-poster aesthetic, expressive painterly brushstrokes, high-contrast lighting, atmospheric smoke and glowing haze. Slightly exaggerated proportions, graphic shapes, bold silhouettes, textured shading, matte-painted background. Not photorealistic — illustrated, stylized, poster-like. Strong emotional tension, dramatic composition, survival-theme mood. Perfect for YouTube thumbnails.
`;

const IMAGE_PROMPT_TEMPLATE = `Hyper-realistic, ultra-detailed [TYPE OF SHOT OR SCENE]...`;

export const generateStructure = async (config: VideoConfig, instructions?: string, model: string = 'gpt-4o'): Promise<StructureItem[]> => {
  const nicheId = config.nicheId || config.niche.toLowerCase();
  
  if (typeof window !== 'undefined') {
      const savedNiches = localStorage.getItem('tubeScript_niches');
      if (savedNiches) {
          const parsedNiches: NicheConfig[] = JSON.parse(savedNiches);
          const customNiche = parsedNiches.find(n => n.id === config.nicheId || n.name === config.niche);
          if (customNiche && customNiche.customStructurePrompt) {
              return generateCustomStructureOpenAI(config, customNiche, instructions, model);
          }
      }
  }

  if (nicheId.includes('slavery')) {
    return generateSlaveryStructureOpenAI(config, instructions, model);
  } else if (nicheId.includes('war')) {
    return generateWarStructureOpenAI(config, instructions, model);
  } else {
    return generateCaprioStructureOpenAI(config, instructions, model);
  }
};

function parseExplicitPartCount(instructions: string): number | null {
    if (!instructions) return null;
    const regex = /(\d+)\s*([a-zA-Zа-яА-Я]+)?\s*(parts|sections|chapters|частин|розділів|структур)/i;
    const match = instructions.match(regex);
    return match ? parseInt(match[1]) : null;
}

function parseBatchSizeFromWorkflow(workflow: string): number {
    if (!workflow) return 4;
    const regex = /(?:по|batches of|groups of)\s*(\d+)\s*(?:частин|parts)/i;
    const match = workflow.match(regex);
    return match && parseInt(match[1]) > 0 ? parseInt(match[1]) : 4;
}

async function generateCustomStructureOpenAI(config: VideoConfig, niche: NicheConfig, instructions?: string, model: string = 'gpt-4o'): Promise<StructureItem[]> {
    const customPromptTemplate = niche.customStructurePrompt || '';
    let totalParts = 0;
    const explicitCount = parseExplicitPartCount(instructions || '');
    if (explicitCount) totalParts = explicitCount;
    else totalParts = Math.max(3, Math.ceil((config.durationMinutes || 10) / 3));

    const workflowDesc = niche.workflowDescription || '';
    const batchSize = parseBatchSizeFromWorkflow(workflowDesc);
    const workflowLogic = workflowDesc ? `\n\n[GENERAL WORKFLOW]\n${workflowDesc}\n` : "";
    
    const fullStructure: StructureItem[] = [];
    const loopCount = Math.ceil(totalParts / batchSize);
    const basePrompt = customPromptTemplate
        .replace(/{{TITLE}}/g, config.title)
        .replace(/{{DURATION}}/g, config.durationMinutes.toString())
        .replace(/{{TOTAL_PARTS}}/g, totalParts.toString());

    for (let i = 0; i < loopCount; i++) {
        const startPart = i * batchSize + 1;
        const endPart = Math.min((i + 1) * batchSize, totalParts);
        const currentBatchSize = endPart - startPart + 1;
        
        let prompt = "";
        if (i === 0) {
            prompt = `${basePrompt}${workflowLogic}${instructions ? `\nUSER INSTRUCTIONS: ${instructions}` : ''}\nTASK: Generate PARTS ${startPart}-${endPart}. Count: ${currentBatchSize}.`;
        } else {
            const previousContext = fullStructure.slice(-3).map(s => `[${s.title}]: ${s.description.substring(0, 100)}...`).join('\n');
            prompt = `${basePrompt}${workflowLogic}\nPREVIOUS CONTEXT:\n${previousContext}\nTASK: Generate PARTS ${startPart}-${endPart}. Count: ${currentBatchSize}.`;
        }

        try {
            const response = await callOpenAI<any>("You are an expert strategist. Output strictly JSON.", prompt, model);
            let newItems: StructureItem[] = [];
            if (Array.isArray(response)) newItems = response;
            else if (response && typeof response === 'object') {
                const values = Object.values(response);
                const foundArray = values.find(v => Array.isArray(v));
                if (foundArray) newItems = foundArray as StructureItem[];
            }
            if (newItems.length > 0) fullStructure.push(...newItems);
        } catch (error) { if (fullStructure.length === 0) throw error; }
    }
    return fullStructure;
}

async function generateSlaveryStructureOpenAI(config: VideoConfig, instructions?: string, model: string = 'gpt-4o'): Promise<StructureItem[]> {
  const fullStructure: StructureItem[] = [];
  const TOTAL_PARTS = 12;
  const BATCH_SIZE = 4;
  const userInstructionBlock = instructions ? `USER GUIDANCE: "${instructions}"` : "";
  for (let i = 0; i < TOTAL_PARTS; i += BATCH_SIZE) {
    const isFirstBatch = i === 0;
    let prompt = "";
    if (isFirstBatch) {
       prompt = `${SLAVERY_PROMPT_TEMPLATE.replace('{{TITLE}}', config.title)} ${userInstructionBlock} TASK: Write PARTS 1-${BATCH_SIZE}.`;
    } else {
       const previousContext = fullStructure.map(s => `[${s.title}]: ${s.description}`).join('\n');
       prompt = `${SLAVERY_PROMPT_TEMPLATE.replace('{{TITLE}}', config.title)} ${userInstructionBlock} PREVIOUS: ${previousContext} TASK: Write PARTS ${i+1}-${i+BATCH_SIZE}.`;
    }
    try {
        const res = await callOpenAI<{ items: StructureItem[] }>("You are a documentary scriptwriter. JSON only.", prompt, model);
        if (res && res.items) fullStructure.push(...res.items);
    } catch (error) { if (fullStructure.length === 0) throw error; break; }
  }
  return fullStructure;
}

async function generateWarStructureOpenAI(config: VideoConfig, instructions?: string, model: string = 'gpt-4o'): Promise<StructureItem[]> {
  const fullStructure: StructureItem[] = [];
  const estimatedParts = Math.max(3, Math.ceil(config.durationMinutes / 3.5));
  const TOTAL_PARTS = estimatedParts;
  const BATCH_SIZE = 4;
  const basePrompt = WAR_BASE_PROMPT.replace('{{TITLE}}', config.title).replace('{{TOTAL_PARTS}}', TOTAL_PARTS.toString());
  const userInstructionBlock = instructions ? `USER INSTRUCTIONS: "${instructions}"` : "";

  for (let i = 0; i < TOTAL_PARTS; i += BATCH_SIZE) {
    const partStart = i + 1;
    const partEnd = Math.min(i + BATCH_SIZE, TOTAL_PARTS);
    let prompt = "";
    if (i === 0) {
       prompt = `${basePrompt} ${userInstructionBlock} TASK: Write PARTS ${partStart}-${partEnd}.`;
    } else {
       const previousContext = fullStructure.map(s => `[${s.title}]: ${s.description}`).join('\n');
       prompt = `${basePrompt} ${userInstructionBlock} PREVIOUS: ${previousContext} TASK: Write PARTS ${partStart}-${partEnd}.`;
    }
    try {
        const res = await callOpenAI<{ items: StructureItem[] }>("You are a hyper-realistic writer. JSON only.", prompt, model);
        if (res && res.items) fullStructure.push(...res.items);
    } catch (error) { if (fullStructure.length === 0) throw error; break; }
  }
  return fullStructure;
}

async function generateCaprioStructureOpenAI(config: VideoConfig, instructions?: string, model: string = 'gpt-4o'): Promise<StructureItem[]> {
  const optimalPartCount = Math.max(3, Math.ceil(config.durationMinutes / 3));
  const prompt = CAPRIO_BASE_PROMPT.replace('{{TITLE}}', config.title) + `\n${instructions ? `USER: ${instructions}` : ''}\nPARTS COUNT: ${optimalPartCount}`;
  try {
      const res = await callOpenAI<{ items: StructureItem[] }>("You are an elite showrunner. JSON only.", prompt, model);
      return res?.items || [];
  } catch (e) { throw e; }
}

export const refineStructure = async (currentStructure: StructureItem[], config: VideoConfig, instructions: string, model: string = 'gpt-4o'): Promise<StructureItem[]> => {
  const prompt = `Current Structure:\n${JSON.stringify(currentStructure, null, 2)}\nChange Request: "${instructions}"\nOutput JSON with 'items' array.`;
  try {
    const res = await callOpenAI<{ items: StructureItem[] }>("You are a professional script editor. JSON only.", prompt, model);
    return res?.items || currentStructure;
  } catch (error) { throw error; }
};

export const refinePromptWithAI = async (currentPrompt: string, userInstructions: string, model: string = 'gpt-4o'): Promise<string> => {
    const prompt = `CURRENT:\n"""${currentPrompt}"""\nREQUEST: "${userInstructions}"\nTASK: Rewrite prompt. Output JSON { "refinedPrompt": "..." }`;
    try {
        const res = await callOpenAI<{ refinedPrompt: string }>("You are an expert Prompt Engineer. JSON only.", prompt, model);
        return res?.refinedPrompt || currentPrompt;
    } catch (e) { return currentPrompt; }
};

export const generateScriptSection = async (config: VideoConfig, structure: StructureItem[], partIndex: number, instructions?: string, model: string = 'gpt-4o'): Promise<{ contentEn: string, contentUa: string }> => {
  const currentPart = structure[partIndex];
  if (!currentPart) throw new Error("Part not found");

  const nicheId = config.nicheId || config.niche.toLowerCase();
  
  let promptTemplate = CAPRIO_SCRIPT_PROMPT;
  if (nicheId.includes('slavery')) promptTemplate = SLAVERY_SCRIPT_PROMPT;
  else if (nicheId.includes('war')) promptTemplate = WAR_SCRIPT_PROMPT_TEMPLATE;
  else if (nicheId.includes('caprio')) promptTemplate = CAPRIO_SCRIPT_PROMPT;

   if (typeof window !== 'undefined') {
      const savedNiches = localStorage.getItem('tubeScript_niches');
      if (savedNiches) {
          const parsedNiches: NicheConfig[] = JSON.parse(savedNiches);
          const customNiche = parsedNiches.find(n => n.id === config.nicheId || n.name === config.niche);
          if (customNiche && customNiche.customScriptPrompt) {
              promptTemplate = customNiche.customScriptPrompt;
          }
      }
  }

  const structureContext = structure.map((s, i) => `[Part ${i+1}] ${s.title}: ${s.description}`).join('\n');
  const partPrompt = promptTemplate
      .replace(/{{TITLE}}/g, config.title)
      .replace(/{{STRUCTURE_TEXT}}/g, structureContext)
      .replace(/{{CURRENT_PART_NUM}}/g, (partIndex + 1).toString())
      .replace(/{{TOTAL_PARTS}}/g, structure.length.toString())
      .replace(/{{MIN_LENGTH}}/g, "1500")
      .replace(/{{MAX_LENGTH}}/g, "3000")
      .replace(/{{MIN_WORDS}}/g, "300")
      .replace(/{{MAX_WORDS}}/g, "600");
  
  const finalPrompt = `${partPrompt}\n${instructions ? `USER INSTRUCTIONS: ${instructions}` : ''}\nTASK: Write the script for Part ${partIndex + 1}.`;

  try {
      const res = await callOpenAI<{ scriptEnglish: string, scriptUkrainian: string }>(
          "You are a professional scriptwriter. Return JSON.",
          finalPrompt,
          model
      );
      return { contentEn: res.scriptEnglish || '', contentUa: res.scriptUkrainian || '' };
  } catch (e) {
      console.error("Script generation failed", e);
      return { contentEn: '', contentUa: '' };
  }
};

export const regenerateScriptSection = async (config: VideoConfig, structure: StructureItem[], partIndex: number, currentContent: string, instructions: string, model: string = 'gpt-4o'): Promise<{ contentEn: string, contentUa: string }> => {
   const prompt = `
   PROJECT: ${config.title}
   PART: ${partIndex + 1}
   CURRENT CONTENT:
   """
   ${currentContent}
   """
   USER INSTRUCTIONS FOR REWRITE:
   "${instructions}"
   
   TASK: Rewrite the script section based on instructions. Keep the same format.
   OUTPUT JSON: { "scriptEnglish": "...", "scriptUkrainian": "..." }
   `;
   
   try {
      const res = await callOpenAI<{ scriptEnglish: string, scriptUkrainian: string }>(
          "You are a professional script editor. Return JSON.",
          prompt,
          model
      );
      return { contentEn: res.scriptEnglish || '', contentUa: res.scriptUkrainian || '' };
   } catch (e) {
      throw e;
   }
};

const sanitizePrompt = (text: string): string => {
    return text.replace(/blood/gi, "crimson fluid").replace(/kill/gi, "eliminate").replace(/corpse/gi, "fallen figure").replace(/dead/gi, "lifeless").replace(/violent/gi, "intense");
}

export const generateRefinedImagePrompt = async (config: VideoConfig, sourceText: string, instructions: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const safeSource = sanitizePrompt(sourceText.substring(0, 15000));
    const safeInstructions = sanitizePrompt(instructions);
    const prompt = `
      You are an elite Visual Director. Title: "${config.title}". Niche: "${config.niche}". Context: "${safeSource}". Instructions: "${safeInstructions}".
      TASK: Create a safe, cinematic prompt for an AI image generator based on template: ${IMAGE_PROMPT_TEMPLATE}.
      OUTPUT: Return ONLY the final prompt string. No chat.
    `;
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    return response.text ? sanitizePrompt(response.text.trim()) : (safeInstructions || config.title);
  } catch (error) {
    console.error("Error generating refined image prompt:", error);
    return instructions || config.title;
  }
};

export const generateImagePrompts = async (config: VideoConfig, sourceText: string, instructions: string, quantity: number = 4, aspectRatio: string = "16:9"): Promise<ImagePrompt[]> => {
  try {
    const ai = getGeminiClient();
    const safeSource = sanitizePrompt(sourceText.substring(0, 15000));
    const prompt = `
      You are an elite Visual Director. Title: "${config.title}". Context: "${safeSource}". Instructions: "${instructions}".
      TASK: Generate ${quantity} distinct safe image prompts.
      OUTPUT JSON ARRAY: [{ "en": "Prompt...", "ua": "Description..." }]
    `;
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ua: { type: Type.STRING } }, required: ['en', 'ua'] } } },
    }));
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) { return []; }
};

export const generateImage = async (promptText: string, aspectRatio: string = "16:9"): Promise<string | null> => {
  try {
    const ai = getGeminiClient();
    const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }];
    const enhancedPrompt = `Generate a high quality image: ${sanitizePrompt(promptText)}. Style: Cinematic digital art.`;

    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: [{ text: enhancedPrompt }] },
      config: { imageConfig: { aspectRatio: aspectRatio as any }, safetySettings }
    }));

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) { return null; }
};

export const generateWarScenes = async (scriptText: string, minChars: number, maxChars: number, customInstructions: string): Promise<Scene[]> => {
  try {
    const ai = getGeminiClient();
    const prompt = `
      You are a visual director. SOURCE TEXT: "${scriptText}". 
      STYLE (USE VERBATIM AS PREFIX): "${WAR_IMAGE_STYLE.trim()}". 
      INSTRUCTIONS: "${customInstructions}".
      TASK: 
      1. Break text into chunks (${minChars}-${maxChars} chars). 
      2. Create prompt for each chunk: Append specific scene details to the STYLE.
      3. Provide UA translations.
      OUTPUT JSON: [{ "segmentText", "segmentTextUa", "imagePrompt", "imagePromptUa" }]
    `;
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { segmentText: { type: Type.STRING }, segmentTextUa: { type: Type.STRING }, imagePrompt: { type: Type.STRING }, imagePromptUa: { type: Type.STRING } }, required: ['segmentText', 'segmentTextUa', 'imagePrompt', 'imagePromptUa'] } },
        temperature: 0.7,
      },
    }));
    
    // Robust cleaning for Gemini's markdown wrapper
    const text = response.text || '';
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    
    const json = JSON.parse(cleanText);
    
    if (!Array.isArray(json)) return [];
    return json;
  } catch (error) { 
      console.error("War Scene Gen Failed:", error);
      throw error; // Let the UI know it failed
  }
};

export const analyzeTitles = async (titles: string[]): Promise<string[]> => {
    try {
        const ai = getGeminiClient();
        const prompt = `Analyze these titles:\n${titles.join('\n')}\nExtract 3-5 keywords. JSON array of strings.`;
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        }));
        return response.text ? JSON.parse(response.text) : [];
    } catch (e) { return []; }
};

export const analyzeNicheContent = async (nicheName: string, transcripts: string[]): Promise<{ structurePrompt: string, scriptPrompt: string }> => {
    try {
        const ai = getGeminiClient();
        if (!transcripts || transcripts.length === 0) return { structurePrompt: '', scriptPrompt: '' };
        
        const structPrompt = `Analyze transcripts for "${nicheName}":\n${transcripts.map(t => t.substring(0, 5000)).join('\n---\n')}\nTASK: Create a structure prompt.`;
        const scriptPrompt = `Analyze transcripts:\n${transcripts.map(t => t.substring(0, 5000)).join('\n---\n')}\nTASK: Create a script prompt.`;

        const [structRes, scriptRes] = await Promise.all([
            retryOperation<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: structPrompt })),
            retryOperation<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: scriptPrompt }))
        ]);
        return { structurePrompt: structRes.text || '', scriptPrompt: scriptRes.text || '' };
    } catch (e) { return { structurePrompt: '', scriptPrompt: '' }; }
};

export const analyzeVisuals = async (title: string, thumbnailUrl?: string): Promise<string[]> => {
    try {
        const ai = getGeminiClient();
        const prompt = `Analyze visual style for video "${title}". Return 5 keywords. JSON array of strings.`;
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        }));
        return response.text ? JSON.parse(response.text) : [];
    } catch (e) { return ["Cinematic"]; }
};