require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);
  
  // Try a series of model names to see which ones work
  const modelsToTest = [
    'gemini-3.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash-lite',
    'gemini-flash',
  ];

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 100 }
      });
      const result = await model.generateContent('{"test": "ok"}');
      const text = result.response.text();
      console.log(`✅ ${modelName} - WORKS: ${text.substring(0, 50)}`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('429') || msg.includes('quota')) {
        console.log(`⚠️  ${modelName} - QUOTA EXCEEDED`);
      } else if (msg.includes('404') || msg.includes('not found')) {
        console.log(`❌ ${modelName} - NOT FOUND`);
      } else {
        console.log(`❌ ${modelName} - ERROR: ${msg.substring(0, 100)}`);
      }
    }
  }
}

listModels();
