import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import requests
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# CONFIGURATION
# -----------------------------
API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_ID = "gemini-3.1-flash" 
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent?key={API_KEY}"

app = FastAPI(title="AgentForge: ORBIT Hyperthon Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Create Session-Based Memory
memory_store = {}
topic_store = {}

class UserInput(BaseModel):
    session_id: str
    user_message: str
    name: str
    topic: str
    skill_level: str = "Beginner"
    hackathon_idea: str = ""

# -----------------------------
# MEMORY-ENABLED LLM CALL 
# -----------------------------
def call_gemini(session_id: str, prompt: str) -> str:
    # 2. When a request arrives: Check session
    if session_id not in memory_store:
        memory_store[session_id] = []

    # 3. Store conversation history - Append user message
    # (Mapping "user" role to Gemini's expected format)
    memory_store[session_id].append({
        "role": "user", 
        "parts": [{"text": prompt}]
    })

    # 4. Limit memory size: Keep only last 15 messages
    memory_store[session_id] = memory_store[session_id][-15:]

    # 6. Replace static PromptTemplate logic
    # Instead send: conversation_history + latest_user_message to the LLM
    payload = {
        "contents": memory_store[session_id],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000,
            "thinkingConfig": {"thinkingLevel": "medium"} 
        }
    }
    
    try:
        response = requests.post(BASE_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        model_response = data['candidates'][0]['content']['parts'][0]['text']
        
        # After generating LLM response, append to history
        memory_store[session_id].append({
            "role": "model", 
            "parts": [{"text": model_response}]
        })
        
        # Re-limit memory size again
        memory_store[session_id] = memory_store[session_id][-15:]
        
        return model_response
    except Exception as e:
        print(f"API Error: {e}")
        return "The Agent is currently analyzing... please retry."

# -----------------------------
# IMPROVED AGENTIC DOMAINS
# -----------------------------

def generate_skill_assessment(session_id: str, name: str, topic: str, level: str):
    prompt = f"You are a direct, code-heavy, smart human hacker mentor. Analyze {name}'s {level} skills specifically for a {topic} project. Keep it under 3 sentences. Be direct, technical, and use hacker terminology."
    return call_gemini(session_id, prompt)

def assess_and_roadmap(session_id: str, name: str, topic: str, level: str):
    prompt = f"Mentor: Break down the architecture for a {topic} hackathon project into 5 concrete technical steps. Avoid fluff. Focus on frameworks, APIs, and deployment infrastructure. Only return the step-by-step roadmap."
    return call_gemini(session_id, prompt)

def generate_project_ideas(session_id: str, topic: str):
    prompt = f"Mentor: Pitch 3 highly technical, non-trivial hackathon projects related to {topic}. Focus on complex architectures, scalable backends, or novel AI integration. Be concise."
    return call_gemini(session_id, prompt)

def suggest_and_code(session_id: str, topic: str, idea: str):
    prompt = f"Mentor: Write the core boilerplate code for {topic} (Idea: {idea}). Give me a lean, production-ready Python script snippet. Skip the pleasantries, just give me the code."
    return call_gemini(session_id, prompt)

def generate_debug_code(session_id: str, topic: str):
    prompt = f"Mentor: Show a common subtle bug (like a race condition, memory leak, or unhandled promise) in a {topic} context. Explain the bug in 1 sentence, then show the fixed code snippet."
    return call_gemini(session_id, prompt)

def generate_code_explanation(session_id: str, topic: str):
    prompt = f"Mentor: Explain the underlying algorithmic complexity or data structure implementation for a critical component in {topic}. Be hyper-technical and explain it like I'm a senior engineer."
    return call_gemini(session_id, prompt)

def review_and_predict(session_id: str, topic: str, idea: str):
    prompt = f"Mentor: What are the 4 most difficult technical questions a senior judge will ask about the architecture of '{idea}' ({topic})? Give the questions, then give a 1-sentence aggressive, confident answer for each."
    return call_gemini(session_id, prompt)

def generate_demo_simulation(session_id: str, idea: str):
    prompt = f"Mentor: Write a 3-step, 60-second live demo script for '{idea}'. Focus on showing off the hardest technical feature. No fluff, just what to click and what to say."
    return call_gemini(session_id, prompt)

# -----------------------------
# THE WINNING ENDPOINT
# -----------------------------
# 8. Maintain existing API routes (Do not delete endpoints, only enhance)
@app.post("/start_journey")
def start_journey(user: UserInput):
    # 5. Add Smart Reset Logic
    # If topic changes: if new_topic != previous_topic: memory_store[session_id] = []
    previous_topic = topic_store.get(user.session_id)
    if previous_topic and user.topic != previous_topic:
        memory_store[user.session_id] = []
    
    topic_store[user.session_id] = user.topic

    # Pre-inject the actual user message if needed, but the prompts below act as the user's conversational turns
    if user.session_id not in memory_store:
        memory_store[user.session_id] = []
        
    execution_plan = ["Analyze Profile", "Generate Roadmap", "Draft Architecture", "Simulate Interview"]
    
    # 2. EXECUTION (Running sequence through the conversational framework)
    skill_assessment = generate_skill_assessment(user.session_id, user.name, user.topic, user.skill_level)
    roadmap = assess_and_roadmap(user.session_id, user.name, user.topic, user.skill_level)
    project_ideas = generate_project_ideas(user.session_id, user.topic)
    project_code = suggest_and_code(user.session_id, user.topic, user.hackathon_idea)
    debugged_code = generate_debug_code(user.session_id, user.topic)
    code_explanation = generate_code_explanation(user.session_id, user.topic)
    judge_prep = review_and_predict(user.session_id, user.topic, user.hackathon_idea)
    demo_simulation = generate_demo_simulation(user.session_id, user.hackathon_idea)
    
    # 9. Return structured response format
    return {
        "planner": execution_plan,
        "skill_assessment": skill_assessment,
        "roadmap": roadmap,
        "project_ideas": project_ideas,
        "generated_code": project_code,
        "debugged_code": debugged_code,
        "code_explanation": code_explanation,
        "judge_questions": judge_prep,
        "demo_simulation": demo_simulation,
        "history_count": len(memory_store.get(user.session_id, []))
    }