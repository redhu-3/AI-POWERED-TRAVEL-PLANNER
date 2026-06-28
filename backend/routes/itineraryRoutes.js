const express = require('express');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');
const Itinerary = require('../models/Itinerary');
const { generateItineraryPDF } = require('../utils/pdfService');

const router = express.Router();

// Fallback high-quality images for beautiful UI when Unsplash is not configured or fails
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
];

// Helper to fetch weather
async function getWeatherData(destination) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return {
      temp: 20,
      condition: 'Mild',
      icon: '03d',
      forecast: 'Weather data unavailable. Plan for comfortable outdoor activities.'
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)}&units=metric&appid=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      forecast: `Current temperature is ${Math.round(data.main.temp)}°C with ${data.weather[0].description}.`
    };
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    return {
      temp: 22,
      condition: 'Clear',
      icon: '01d',
      forecast: 'Assuming fair weather. Ideal for general exploration.'
    };
  }
}

// Helper to fetch Unsplash images
async function getDestinationImages(destination) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return FALLBACK_IMAGES;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination + ' travel landmark')}&per_page=3&client_id=${accessKey}`;
    const response = await axios.get(url);
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results.map(img => img.urls.regular);
    }
    return FALLBACK_IMAGES;
  } catch (err) {
    console.error('Unsplash fetch error:', err.message);
    return FALLBACK_IMAGES;
  }
}

// Helper to fetch currency exchange rate from USD to target currency
async function getExchangeRate(targetCurrency) {
  if (!targetCurrency || targetCurrency === 'USD') {
    return 1.0;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  let url = 'https://open.er-api.com/v6/latest/USD'; // Free public API fallback

  if (apiKey) {
    url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
  }

  try {
    const response = await axios.get(url);
    if (response.data && response.data.rates && response.data.rates[targetCurrency]) {
      return response.data.rates[targetCurrency];
    }
    // Check v6 exchange rate format if key was used
    if (response.data && response.data.conversion_rates && response.data.conversion_rates[targetCurrency]) {
      return response.data.conversion_rates[targetCurrency];
    }
    return 1.0;
  } catch (err) {
    console.error('ExchangeRate fetch error:', err.message);
    // If apiKey request failed, try keyless fallback
    if (apiKey) {
      try {
        const fallbackRes = await axios.get('https://open.er-api.com/v6/latest/USD');
        if (fallbackRes.data && fallbackRes.data.rates && fallbackRes.data.rates[targetCurrency]) {
          return fallbackRes.data.rates[targetCurrency];
        }
      } catch (fallbackErr) {
        console.error('ExchangeRate fallback fetch error:', fallbackErr.message);
      }
    }
    return 1.0;
  }
}

// @route   POST /api/itinerary/generate
// @desc    Generate a travel itinerary using Gemini with weather & currency context
// @access  Protected
router.post('/generate', authMiddleware, async (req, res) => {
  const { destination, days, budget, interests } = req.body;

  // 1. Validation
  if (!destination || typeof destination !== 'string' || destination.trim() === '') {
    return res.status(400).json({ message: 'Valid destination is required.' });
  }

  const duration = parseInt(days, 10);
  if (isNaN(duration) || duration < 1 || duration > 30) {
    return res.status(400).json({ message: 'Duration must be a number between 1 and 30 days.' });
  }

  if (!budget || !['Low', 'Medium', 'High'].includes(budget)) {
    return res.status(400).json({ message: 'Budget must be Low, Medium, or High.' });
  }

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    return res.status(400).json({ message: 'At least one interest must be selected.' });
  }

  try {
    // 2. Fetch Weather, Unsplash images
    const weatherData = await getWeatherData(destination);
    const images = await getDestinationImages(destination);

    // 3. Prompt Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ message: 'Google Gemini API key is missing on the server.' });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    });

    const weatherContext = `The current weather in ${destination} is ${weatherData.condition} (${weatherData.temp}°C). ${
      weatherData.condition.toLowerCase().includes('rain') || weatherData.condition.toLowerCase().includes('snow')
        ? 'Please prioritize indoor activities and attractions.'
        : 'Please prioritize outdoor and scenic activities.'
    }`;

    const prompt = `
      You are a professional travel planner. Create a highly detailed, personalized, end-to-end travel itinerary.
      
      Trip Parameters:
      - Destination: ${destination}
      - Duration: ${duration} Days
      - Budget Profile: ${budget} (Please budget activities and meals accordingly)
      - Interests: ${interests.join(', ')}
      - Weather Context: ${weatherContext}

      You must return a raw JSON object strictly conforming to this exact JSON schema:
      {
        "destination": "string (the city and country, verified)",
        "duration": number,
        "localCurrencyCode": "string (3-letter currency code, e.g. EUR, JPY, INR, GBP, CAD)",
        "localCurrencySymbol": "string (currency symbol, e.g. €, ¥, ₹, £, $)",
        "days": [
          {
            "day": number,
            "morning": "string (detailed activity for morning)",
            "afternoon": "string (detailed activity for afternoon)",
            "evening": "string (detailed activity for evening)",
            "foodRecommendation": "string (authentic local food/drink suggestion or restaurant recommendation for this day)",
            "estimatedCost": "string (estimated cost for this day's activities and food, formatted in USD like '$40')"
          }
        ],
        "accommodationSuggestions": [
          "string (3 specific hotel, hostel, or rental recommendations with brief description matching the budget profile)"
        ],
        "travelTips": [
          "string (3-4 practical travel tips for this destination, including local transport, safety, or customs)"
        ],
        "budgetBreakdown": {
          "food": number (total estimated USD spend on food for the entire trip),
          "accommodation": number (total estimated USD spend on accommodation for the entire trip),
          "transport": number (total estimated USD spend on local transport for the entire trip),
          "activities": number (total estimated USD spend on activities/entrance fees for the entire trip)
        }
      }

      Strict Guidelines:
      - Return ONLY the raw JSON object. Do not wrap in markdown \`\`\`json blocks.
      - Ensure all day numbers from 1 to ${duration} are covered sequentially.
      - Tailor the estimatedCost and budgetBreakdown to the ${budget} budget profile.
      - Incorporate the weather conditions in the morning/afternoon/evening plans.
      - budgetBreakdown values must be plain numbers (no $ sign, no string).
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();

    // Strip markdown code fences if model wrapped the JSON
    textResponse = textResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let itineraryJson;
    try {
      itineraryJson = JSON.parse(textResponse);
    } catch (parseErr) {
      console.error('Gemini output was not valid JSON (attempt 1), retrying...', parseErr.message);
      // Retry once with a more explicit, shorter prompt
      const retryPrompt = `Return ONLY a valid JSON object for a ${duration}-day trip to ${destination} with budget ${budget}.
        Schema: {"destination":"string","duration":${duration},"localCurrencyCode":"string","localCurrencySymbol":"string","days":[{"day":1,"morning":"string","afternoon":"string","evening":"string","foodRecommendation":"string","estimatedCost":"string"}],"accommodationSuggestions":["string"],"travelTips":["string"],"budgetBreakdown":{"food":0,"accommodation":0,"transport":0,"activities":0}}
        Rules: Return ONLY raw JSON. No markdown. No extra text. Fill all ${duration} days. budgetBreakdown values must be plain numbers.`;
      try {
        const retryResult = await model.generateContent(retryPrompt);
        let retryText = retryResult.response.text();
        retryText = retryText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        itineraryJson = JSON.parse(retryText);
      } catch (retryErr) {
        console.error('Gemini retry also failed:', retryErr.message);
        return res.status(500).json({ 
          message: 'Failed to generate a valid itinerary. Please try again.',
          error: retryErr.message 
        });
      }
    }

    // 4. Fetch Exchange rate for local currency relative to USD
    const localCurrency = itineraryJson.localCurrencyCode || 'USD';
    const rate = await getExchangeRate(localCurrency);

    const breakdown = itineraryJson.budgetBreakdown || {};
    const completeItinerary = {
      destination: itineraryJson.destination,
      duration: itineraryJson.duration,
      budget: budget,
      interests: interests,
      days: itineraryJson.days,
      accommodationSuggestions: itineraryJson.accommodationSuggestions,
      travelTips: itineraryJson.travelTips,
      weather: weatherData,
      currency: {
        code: localCurrency,
        symbol: itineraryJson.localCurrencySymbol || '$',
        rate: rate
      },
      images: images,
      budgetTracker: {
        estimated: {
          food:          Number(breakdown.food)          || 0,
          accommodation: Number(breakdown.accommodation) || 0,
          transport:     Number(breakdown.transport)     || 0,
          activities:    Number(breakdown.activities)    || 0
        },
        actual: { food: 0, accommodation: 0, transport: 0, activities: 0 },
        currency: localCurrency,
        symbol:   itineraryJson.localCurrencySymbol || '$'
      }
    };

    res.json(completeItinerary);
  } catch (err) {
    console.error('Itinerary generation error:', err);
    res.status(500).json({ 
      message: 'An error occurred during itinerary generation. Please check your inputs and API keys.', 
      error: err.message 
    });
  }
});

// @route   POST /api/itinerary/regenerate-day
// @desc    Regenerate just a single day's plan keeping the rest unchanged
// @access  Public (for collaborators as well)
router.post('/regenerate-day', async (req, res) => {
  const { destination, budget, interests, weatherCondition, dayNumber } = req.body;

  if (!destination || !budget || !interests || !dayNumber) {
    return res.status(400).json({ message: 'Missing fields required for regeneration.' });
  }

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ message: 'Google Gemini API key is missing on the server.' });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048
      }
    });

    const weatherText = weatherCondition ? `The current weather is ${weatherCondition}.` : '';

    const prompt = `
      You are a professional travel planner. A traveler wants to regenerate only a single day (Day ${dayNumber}) of their trip to ${destination}.
      
      Trip Details:
      - Destination: ${destination}
      - Budget Profile: ${budget}
      - Interests: ${interests.join ? interests.join(', ') : interests}
      - Weather: ${weatherText}

      Please generate a fresh plan for Day ${dayNumber}. It must be completely new and interesting.
      You must return a raw JSON object matching this exact schema:
      {
        "day": ${dayNumber},
        "morning": "string (detailed activity for morning)",
        "afternoon": "string (detailed activity for afternoon)",
        "evening": "string (detailed activity for evening)",
        "foodRecommendation": "string (local culinary suggestion or eatery for this day)",
        "estimatedCost": "string (estimated cost formatted in USD like '$55')"
      }
      
      Return ONLY the raw JSON object. Do not include markdown wraps.
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    textResponse = textResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let newDayJson;
    try {
      newDayJson = JSON.parse(textResponse);
    } catch (parseErr) {
      console.error('Regeneration parse error:', parseErr.message);
      return res.status(500).json({ message: 'Failed to parse regenerated day.', error: parseErr.message });
    }

    res.json(newDayJson);
  } catch (err) {
    console.error('Day regeneration error:', err);
    res.status(500).json({ message: 'Error regenerating day plans.', error: err.message });
  }
});

// @route   POST /api/itinerary/save
// @desc    Save or update an itinerary in the database
// @access  Protected
router.post('/save', authMiddleware, async (req, res) => {
  const {
    _id,
    destination,
    duration,
    budget,
    interests,
    weather,
    currency,
    images,
    days,
    accommodationSuggestions,
    travelTips
  } = req.body;

  // Guard: ensure required Mongoose fields always have a value
  const safeDestination = destination || 'Unknown Destination';
  const safeDuration = duration || (days ? days.length : 1);
  const safeBudget = budget || 'Medium';
  const safeInterests = Array.isArray(interests) && interests.length > 0 ? interests : [];

  try {
    if (_id) {
      // Check if it exists and belongs to the user
      let itinerary = await Itinerary.findById(_id).catch(() => null);
      if (itinerary) {
        if (itinerary.user.toString() !== req.user.id) {
          return res.status(401).json({ message: 'User not authorized to update this itinerary.' });
        }
        // Update fields
        itinerary.destination = safeDestination;
        itinerary.duration = safeDuration;
        itinerary.budget = safeBudget;
        itinerary.interests = safeInterests;
        itinerary.weather = weather;
        itinerary.currency = currency;
        itinerary.images = images || [];
        itinerary.days = days || [];
        itinerary.accommodationSuggestions = accommodationSuggestions || [];
        itinerary.travelTips = travelTips || [];

        await itinerary.save();
        return res.json(itinerary);
      }
    }

    // Create new itinerary linked to logged-in user
    const itinerary = new Itinerary({
      user: req.user.id,
      destination: safeDestination,
      duration: safeDuration,
      budget: safeBudget,
      interests: safeInterests,
      weather,
      currency,
      images: images || [],
      days: days || [],
      accommodationSuggestions: accommodationSuggestions || [],
      travelTips: travelTips || []
    });

    await itinerary.save();
    res.status(201).json(itinerary);
  } catch (err) {
    // Log full Mongoose validation errors for debugging
    if (err.name === 'ValidationError') {
      const fields = Object.keys(err.errors).map(f => `${f}: ${err.errors[f].message}`);
      console.error('Save itinerary ValidationError:', fields.join(' | '));
      return res.status(400).json({ message: 'Validation failed: ' + fields.join(', '), error: err.message });
    }
    console.error('Save itinerary error:', err.name, err.message);
    res.status(500).json({ message: 'Server error saving itinerary.', error: err.message });
  }
});

// @route   GET /api/itinerary
// @desc    Get all saved itineraries for the logged-in user
// @access  Protected
router.get('/', authMiddleware, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(itineraries);
  } catch (err) {
    console.error('Fetch itineraries error:', err);
    res.status(500).json({ message: 'Server error retrieving saved itineraries.', error: err.message });
  }
});

// @route   DELETE /api/itinerary/:id
// @desc    Delete a saved itinerary
// @access  Protected
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }

    // Verify ownership
    if (itinerary.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this itinerary.' });
    }

    await Itinerary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Itinerary deleted successfully.' });
  } catch (err) {
    console.error('Delete itinerary error:', err);
    res.status(500).json({ message: 'Server error deleting itinerary.', error: err.message });
  }
});

// @route   GET /api/itinerary/:id/export-pdf
// @desc    Export a saved itinerary as a PDF file
// @access  Protected
router.get('/:id/export-pdf', authMiddleware, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }

    // Verify ownership
    if (itinerary.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to download this itinerary.' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    const safeFilename = `${itinerary.destination.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    // Stream PDF directly to the response object
    generateItineraryPDF(itinerary, res);
  } catch (err) {
    console.error('Export PDF error:', err);
    // Note: If headers are already sent, sending JSON might fail, but pdfkit doesn't write until we call doc.end/pipe
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error generating PDF.', error: err.message });
    }
  }
});

// @route   POST /api/itinerary/:id/share
// @desc    Generate a shareable link for an itinerary
// @access  Protected
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });

    if (itinerary.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to share this itinerary.' });
    }

    if (!itinerary.shareId) {
      itinerary.shareId = crypto.randomUUID();
      itinerary.isShared = true;
      await itinerary.save();
    }

    res.json({ shareId: itinerary.shareId, isShared: itinerary.isShared });
  } catch (err) {
    console.error('Share itinerary error:', err);
    res.status(500).json({ message: 'Server error generating share link.', error: err.message });
  }
});

// @route   GET /api/itinerary/shared/:shareId
// @desc    Get a shared itinerary by shareId
// @access  Public
router.get('/shared/:shareId', async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ shareId: req.params.shareId });
    if (!itinerary || !itinerary.isShared) {
      return res.status(404).json({ message: 'Shared itinerary not found or is private.' });
    }
    res.json(itinerary);
  } catch (err) {
    console.error('Get shared itinerary error:', err);
    res.status(500).json({ message: 'Server error retrieving shared itinerary.', error: err.message });
  }
});

// @route   POST /api/itinerary/shared/:shareId/save
// @desc    Save changes to a shared itinerary
// @access  Public (for collaborators)
router.post('/shared/:shareId/save', async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ shareId: req.params.shareId });
    if (!itinerary || !itinerary.isShared) {
      return res.status(404).json({ message: 'Shared itinerary not found or is private.' });
    }
    
    // Allow collaborators to update days and basics
    // Strip _id from each subdocument — Mongoose throws if you try to set an
    // immutable subdoc _id to its existing value when reassigning the array.
    if (req.body.days) {
      // eslint-disable-next-line no-unused-vars
      itinerary.days = req.body.days.map(({ _id, __v, ...rest }) => rest);
      itinerary.markModified('days');
    }
    if (req.body.destination) itinerary.destination = req.body.destination;
    if (req.body.budget) itinerary.budget = req.body.budget;
    
    // Allow collaborators to update actual spend
    if (req.body.budgetTracker && req.body.budgetTracker.actual) {
      itinerary.budgetTracker = itinerary.budgetTracker || {};
      itinerary.budgetTracker.actual = {
        food: Number(req.body.budgetTracker.actual.food) || 0,
        accommodation: Number(req.body.budgetTracker.actual.accommodation) || 0,
        transport: Number(req.body.budgetTracker.actual.transport) || 0,
        activities: Number(req.body.budgetTracker.actual.activities) || 0
      };
      itinerary.markModified('budgetTracker.actual');
    }
    
    await itinerary.save();
    res.json(itinerary);
  } catch (err) {
    console.error('Save shared itinerary error:', err);
    res.status(500).json({ message: 'Server error saving shared itinerary.', error: err.message });
  }
});

// @route   PUT /api/itinerary/:id/budget
// @desc    Update actual spend fields in the budget tracker
// @access  Protected
router.put('/:id/budget', authMiddleware, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });

    // Verify ownership
    if (itinerary.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update budget.' });
    }

    if (req.body.actual) {
      itinerary.budgetTracker = itinerary.budgetTracker || {
        estimated: { food: 0, accommodation: 0, transport: 0, activities: 0 },
        currency: itinerary.currency?.code || 'USD',
        symbol: itinerary.currency?.symbol || '$'
      };
      itinerary.budgetTracker.actual = {
        food: Number(req.body.actual.food) || 0,
        accommodation: Number(req.body.actual.accommodation) || 0,
        transport: Number(req.body.actual.transport) || 0,
        activities: Number(req.body.actual.activities) || 0
      };
      itinerary.markModified('budgetTracker.actual');
    }

    await itinerary.save();
    res.json(itinerary);
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ message: 'Server error updating budget.', error: err.message });
  }
});

module.exports = router;
