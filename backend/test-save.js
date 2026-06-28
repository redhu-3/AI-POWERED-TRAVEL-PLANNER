require('dotenv').config();
const axios = require('axios');

async function test() {
  const base = 'http://localhost:5000/api';

  // 1. Signup
  let token;
  try {
    const r = await axios.post(base + '/auth/signup', {
      name: 'Debug Gen',
      email: 'debug_gen_' + Date.now() + '@test.com',
      password: 'Pass1234'
    });
    token = r.data.token;
    console.log('Signed up OK');
  } catch (e) {
    console.error('Signup failed:', e.response?.data || e.message);
    return;
  }

  // 2. Generate an itinerary
  let itinerary;
  try {
    console.log('Generating itinerary...');
    const genRes = await axios.post(
      base + '/itinerary/generate',
      {
        destination: 'Rome, Italy',
        days: 3,
        budget: 'Medium',
        interests: ['Food', 'Sightseeing']
      },
      { headers: { Authorization: 'Bearer ' + token } }
    );
    itinerary = genRes.data;
    console.log('Generate SUCCESS');
    console.log('Keys in itinerary:', Object.keys(itinerary));
    console.log('budget:', itinerary.budget);
    console.log('interests:', itinerary.interests);
    console.log('duration:', itinerary.duration);
    console.log('destination:', itinerary.destination);
    console.log('days count:', itinerary.days?.length);
    if (itinerary.days && itinerary.days[0]) {
      console.log('Day 1 keys:', Object.keys(itinerary.days[0]));
    }
  } catch (e) {
    console.error('Generate failed:', e.response?.status, JSON.stringify(e.response?.data));
    return;
  }

  // 3. Save that generated itinerary (exactly as the frontend does)
  try {
    console.log('\nSaving itinerary...');
    const saveRes = await axios.post(
      base + '/itinerary/save',
      itinerary,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    console.log('SAVE SUCCESS! Status:', saveRes.status, '_id:', saveRes.data._id);
  } catch (err) {
    console.error('SAVE ERROR - HTTP Status:', err.response?.status);
    console.error('Server message:', JSON.stringify(err.response?.data, null, 2));
  }
}

test();
