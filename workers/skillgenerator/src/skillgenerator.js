const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert AI career coach and technical recruiter. 
Your task is to analyze the provided input text (resume, portfolio, or job description) 
and extract all hard and soft skills. 

Return ONLY valid JSON matching this schema:
{
  "technical_skills": [{"name": "string", "proficiency_level": "beginner|intermediate|expert", "confidence": 0.0-1.0}],
  "soft_skills": [{"name": "string", "context": "string"}],
  "domain_keywords": ["string"]
}
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/v1/extract-skills' && request.method === 'POST') {
      try {
        const body = await request.json();
        
        if (body.use_mock || !env.OPENAI_API_KEY) {
          const mockData = {
            technical_skills: [
              { name: "Cloudflare Workers", proficiency_level: "expert", confidence: 0.99 },
              { name: "JavaScript", proficiency_level: "intermediate", confidence: 0.90 }
            ],
            soft_skills: [
              { name: "Durchhaltevermögen", context: "Hackathon MVP um 4 Uhr nachts deployt" }
            ],
            domain_keywords: ["Serverless", "Edge", "Hackathon"]
          };
          return new Response(JSON.stringify(mockData), { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          });
        }

        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
              { role: "user", content: body.input_text || "Extrahiere meine Skills." }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          })
        });

        if (!openAiResponse.ok) {
          throw new Error(`API Fehler`);
        }

        const data = await openAiResponse.json();
        const extractedJson = JSON.parse(data.choices[0].message.content);

        return new Response(JSON.stringify(extractedJson), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    }

    if (url.pathname === '/api/v1/gap-analysis' && request.method === 'POST') {
      try {
        const body = await request.json();
        const userSkills = body.user_skills || [];
        const targetRoleReqs = body.target_role_requirements || [];

        const userSet = new Set(userSkills.map(s => s.toLowerCase()));
        const targetSet = new Set(targetRoleReqs.map(r => r.toLowerCase()));

        const missingSkills = [...targetSet].filter(x => !userSet.has(x));
        const intersection = [...targetSet].filter(x => userSet.has(x));
        
        const matchScore = targetSet.size > 0 ? intersection.length / targetSet.size : 0;

        const gapData = {
          match_percentage: Number((matchScore * 100).toFixed(2)),
          missing_skills: missingSkills,
          gap_metric_delta_s: Number((1.0 - matchScore).toFixed(2))
        };

        return new Response(JSON.stringify(gapData), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    }

    return new Response(JSON.stringify({ error: "Route not found" }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
};
