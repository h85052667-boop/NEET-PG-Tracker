import { GoogleGenAI, SchemaType } from "@google/genai";
import { StudySession } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize securely; if no key, the app handles the error gracefully in the UI.
const ai = new GoogleGenAI({ apiKey });

export const generateStudyInsights = async (sessions: StudySession[]): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  if (sessions.length === 0) {
    return "No study sessions recorded yet. Start your revision to get personalized insights!";
  }

  // Prepare data summary for the prompt to save tokens and be concise
  const summary = sessions.map(s => ({
    date: new Date(s.startTime).toLocaleDateString(),
    durationMinutes: Math.round(s.duration / 60),
    subject: s.subject,
    concentration: s.concentration,
    notes: s.notes || "None"
  })).slice(-25); // Analyze last 25 sessions for relevance

  const prompt = `
    Analyze the following recent study sessions for a medical student preparing for the NEET PG exam.
    Data: ${JSON.stringify(summary)}
    
    Provide a concise, high-yield, and actionable analysis in markdown format.
    1. Identify trends in concentration relative to specific subjects (Standard 19 subjects) or time of day.
    2. Give 3 specific tips to improve focus or retention, specifically tailored for high-volume medical syllabus revision.
    3. Keep the tone motivational but professional, like a senior resident or mentor.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert NEET PG study coach and productivity analyst.",
      }
    });
    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't analyze your data right now. Please try again later.";
  }
};

export const verifyMCQProof = async (base64Image: string): Promise<{ verified: boolean; count: number; feedback: string }> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  // Clean the base64 string if it contains the header
  const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming png/jpeg, API is flexible with this mimeType param for common images
              data: data
            }
          },
          {
            text: `Analyze this image submitted by a NEET PG aspirant. They claim to have solved MCQs. 
            Check if the image is a screenshot of a quiz app (like Marrow, Prepladder, etc.), a photo of a scorecard, or a handwritten log showing questions solved.
            
            Return a JSON object with:
            1. verified: boolean (true if it looks like legitimate study proof)
            2. count: number (The number of MCQs solved visible in the image. If they just say "100 solved" in handwriting, accept 100. If no number is visible but activity is verified, return 0).
            3. feedback: string (A short encouraging message confirming the count, or explaining why it was rejected).`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("MCQ Verification Error:", error);
    return {
      verified: false,
      count: 0,
      feedback: "AI verification failed. Please check your internet connection or try a clearer image."
    };
  }
};