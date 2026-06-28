require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Key prefix:', key ? key.substring(0, 10) + '...' : 'MISSING');
  console.log('Key length:', key ? key.length : 0);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    console.log('Sending test prompt to Gemini...');
    const result = await model.generateContent('Return a JSON object: {"status": "ok", "message": "hello"}');
    const text = result.response.text();
    console.log('SUCCESS! Response:', text);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testGemini();

testGemini();
