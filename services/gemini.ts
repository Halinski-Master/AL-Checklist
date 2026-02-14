
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { InspectionData } from "../types";

// Function to analyze inspection data using Gemini 3 Flash
export const analyzeInspection = async (data: InspectionData): Promise<string> => {
  // Always initialize Gemini with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const damagedItems = data.sections.flatMap(s => 
    s.items.filter(i => i.status === 'Damage').map(i => `${s.title}: ${i.subject} - ${i.comment}`)
  );

  const textPrompt = `
    Review this ISO Tank Inspection Report for Air Liquide Logistics.
    Tank BIC: ${data.tankBicNumber}
    Carrier: ${data.carrier}
    Product: ${data.product}
    Pressure: ${data.pressure} barg
    Level: ${data.level}
    Final Result: ${data.result}
    
    Damaged/Critical Items:
    ${damagedItems.length > 0 ? damagedItems.join('\n') : 'None reported.'}
    
    Additional Observations:
    ${data.additionalObservations || 'None.'}
    
    Please provide a concise summary (max 3 sentences) of the safety status and any urgent actions required. 
    Analyze any attached photos if they show damage.
  `;

  // Construct parts for multimodal input (text + images)
  const parts: any[] = [{ text: textPrompt }];

  // Process photos if any are provided (they are expected to be base64 data URLs)
  data.photos.forEach(photoDataUrl => {
    const matches = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      parts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2]
        }
      });
    }
  });

  try {
    // Using ai.models.generateContent with the appropriate model for complex text/reasoning tasks
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
      config: {
        temperature: 0.1, // Lower temperature for more factual/precise reporting
      },
    });
    
    // response.text is a property, not a method
    return response.text || "No summary could be generated. Please check the report manually.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Error generating safety analysis. Please perform manual review of all checklist items.";
  }
};
