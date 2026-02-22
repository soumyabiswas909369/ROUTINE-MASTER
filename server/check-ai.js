import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const MODELS_TO_TRY = [
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'google/gemini-flash-1.5-8b',
    'google/gemini-flash-1.5-exp',
    'openai/gpt-4o-mini'
];

async function checkAI() {
    console.log('--- AI DIAGNOSTICS START ---');
    const orKey = process.env.OPENROUTER_API_KEY;
    const gemKey = process.env.GEMINI_API_KEY;

    console.log('Checking OPENROUTER_API_KEY:', orKey ? 'Present' : 'MISSING');
    console.log('Checking GEMINI_API_KEY:', gemKey ? 'Present' : 'MISSING');

    if (orKey) {
        for (const model of MODELS_TO_TRY) {
            try {
                console.log(`TESTING (OpenRouter): ${model}...`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${orKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [{ role: "user", content: "Hi" }],
                        "max_tokens": 10
                    })
                });
                const data = await response.json();
                console.log(`${response.status === 200 ? 'SUCCESS' : 'FAILED'}: ${model}`);
            } catch (err) { console.error(`ERROR: ${model} - ${err.message}`); }
        }
    } else if (gemKey) {
        console.log('Testing DIRECT Gemini Fallback...');
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            });
            console.log(response.status === 200 ? 'SUCCESS: Direct Gemini Key works.' : `FAILED: Direct Gemini Key returned ${response.status}`);
        } catch (err) { console.error(`ERROR: Direct Gemini - ${err.message}`); }
    } else {
        console.error('ERROR: No keys found.');
    }
    console.log('--- AI DIAGNOSTICS END ---');
}

checkAI();
