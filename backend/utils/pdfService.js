const PDFDocument = require('pdfkit');

function generateItineraryPDF(itinerary, stream) {
  const doc = new PDFDocument({ margin: 50 });
  
  // Pipe the generated PDF into the response stream
  doc.pipe(stream);

  // Brand colors
  const colors = {
    primary: '#C8316B',
    secondary: '#3FA796',
    dark: '#1B1620',
    textMain: '#2B2333',
    textMuted: '#7B7086'
  };

  // --- Title & Header ---
  doc.fillColor(colors.primary).fontSize(24).text('TripCraft AI', { align: 'center' });
  doc.moveDown(0.5);

  doc.fillColor(colors.dark).fontSize(20).text(`Itinerary: ${itinerary.destination}`, { align: 'center' });
  
  doc.fillColor(colors.textMuted).fontSize(12).text(
    `${itinerary.duration} Days | ${itinerary.budget} Budget`,
    { align: 'center' }
  );
  doc.moveDown(1.5);

  // --- Weather Summary ---
  if (itinerary.weather && itinerary.weather.temp !== undefined) {
    doc.fillColor(colors.secondary).fontSize(14).text('Weather Overview', { underline: true });
    doc.moveDown(0.3);
    doc.fillColor(colors.textMain).fontSize(12).text(
      `Condition: ${itinerary.weather.condition} | Temp: ${itinerary.weather.temp}°C`
    );
    doc.fillColor(colors.textMuted).fontSize(10).text(itinerary.weather.forecast);
    doc.moveDown(1.5);
  }

  // --- Day-by-Day Plan ---
  if (itinerary.days && itinerary.days.length > 0) {
    doc.fillColor(colors.primary).fontSize(16).text('Day-by-Day Plan');
    doc.moveDown(1);

    itinerary.days.forEach(day => {
      // Day Header
      doc.fillColor(colors.dark).fontSize(14).text(`Day ${day.day}`, { underline: true });
      doc.moveDown(0.5);

      // Morning
      doc.fillColor(colors.secondary).fontSize(11).text('Morning: ', { continued: true });
      doc.fillColor(colors.textMain).text(day.morning);
      doc.moveDown(0.3);
      
      // Afternoon
      doc.fillColor(colors.secondary).text('Afternoon: ', { continued: true });
      doc.fillColor(colors.textMain).text(day.afternoon);
      doc.moveDown(0.3);

      // Evening
      doc.fillColor(colors.secondary).text('Evening: ', { continued: true });
      doc.fillColor(colors.textMain).text(day.evening);
      doc.moveDown(0.3);

      // Food Pick
      if (day.foodRecommendation) {
        doc.fillColor(colors.primary).text('Culinary Pick: ', { continued: true });
        doc.fillColor(colors.textMain).text(day.foodRecommendation);
        doc.moveDown(0.3);
      }

      // Cost Estimate
      if (day.estimatedCost) {
        doc.fillColor(colors.textMuted).text(`Estimated Cost: ${day.estimatedCost}`);
      }
      
      doc.moveDown(1);
    });
  }

  // --- Accommodations ---
  if (itinerary.accommodationSuggestions && itinerary.accommodationSuggestions.length > 0) {
    doc.addPage();
    doc.fillColor(colors.primary).fontSize(16).text('Recommended Accommodations');
    doc.moveDown(1);
    
    doc.fillColor(colors.textMain).fontSize(11);
    itinerary.accommodationSuggestions.forEach(hotel => {
      doc.text(`• ${hotel}`);
      doc.moveDown(0.5);
    });
    doc.moveDown(1);
  }

  // --- Travel Tips ---
  if (itinerary.travelTips && itinerary.travelTips.length > 0) {
    doc.fillColor(colors.primary).fontSize(16).text('Essential Travel Tips');
    doc.moveDown(1);
    
    doc.fillColor(colors.textMain).fontSize(11);
    itinerary.travelTips.forEach(tip => {
      doc.text(`• ${tip}`);
      doc.moveDown(0.5);
    });
  }

  // Finalize the PDF document
  doc.end();
}

module.exports = { generateItineraryPDF };
