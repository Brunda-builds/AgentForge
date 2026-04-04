import os, json, requests, streamlit as st
import urllib3
import time
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- 1. SYSTEM CONFIG & STYLING ---
st.set_page_config(page_title="AgentForge AI", layout="wide", initial_sidebar_state="collapsed")
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

st.markdown("""
    <style>
    .stApp { background: #050505; color: #ffffff; }
    .hero-title { font-size: 5rem; font-weight: 800; color: #ffffff; text-align: center; margin-top: 50px; line-height: 1; }
    .hero-subtitle { font-size: 4rem; font-weight: 800; color: #ff4d4d; text-align: center; margin-top: -10px; text-shadow: 0 0 20px rgba(255,77,77,0.4); }
    .matrix-card { background: #111111; border: 1px solid #333; border-radius: 12px; padding: 20px; height: 280px; overflow-y: auto; transition: 0.3s; }
    .matrix-card:hover { border-color: #ff4d4d; box-shadow: 0 0 15px rgba(255,77,77,0.1); }
    .matrix-header { color: #ff4d4d; font-weight: bold; border-bottom: 1px solid #222; margin-bottom: 10px; font-size: 0.9rem; }
    .badge { padding: 5px 15px; border-radius: 30px; border: 1px solid #444; font-size: 0.8rem; background: rgba(255,255,255,0.05); color: #888; }
    div.stButton > button { background: linear-gradient(90deg, #ff4d4d, #ff0000); border: none; color: white; font-weight: bold; border-radius: 25px; }
    </style>
    """, unsafe_allow_html=True)

# --- 2. THE AI BRAIN (Gemini 3.1) ---
def call_mentor_ai(query, history):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={API_KEY}"
    
    # We provide a split instruction: If they just want to talk, stay conversational. 
    # If they name a field (like Web Dev), fill the JSON.
    system_instruction = """
    Act as a Technical Mentor. 
    1. If the user hasn't picked a field, chat naturally to help them choose (e.g., Web Dev, AI, IoT).
    2. ONCE A FIELD IS CHOSEN: Return ONLY a RAW JSON object with: 
       'reply', 'skill_assessment', 'roadmap', 'project_ideas', 'generated_code', 'debugged_code', 'code_explanation', 'judge_questions', 'demo_simulation'.
    """
    
    messages = [{"role": "user", "parts": [{"text": system_instruction}]}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        messages.append({"role": role, "parts": [{"text": msg["content"]}]})
    messages.append({"role": "user", "parts": [{"text": query}]})

    try:
        res = requests.post(url, json={"contents": messages}, verify=False, timeout=20)
        text = res.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        
        if "{" in text and "}" in text:
            raw = text.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw)
            for k in st.session_state.matrix:
                if k in parsed: st.session_state.matrix[k] = parsed[k]
            st.session_state.matrix_active = True
            return parsed.get("reply", "Matrix Synchronized.")
        return text
    except: return "Connection recalibrating... please resubmit."

# --- 3. SESSION STATE ---
if "flow" not in st.session_state: st.session_state.flow = "hero"
if "matrix_active" not in st.session_state: st.session_state.matrix_active = False
if "matrix" not in st.session_state:
    st.session_state.matrix = {k: "Discovery in progress..." for k in ["skill_assessment", "roadmap", "project_ideas", "generated_code", "debugged_code", "code_explanation", "judge_questions", "demo_simulation"]}
if "messages" not in st.session_state: st.session_state.messages = []

# --- 4. NAVIGATION FLOW ---

# STAGE 1: THE HERO LANDING (Cleaner, No Idea Required)
if st.session_state.flow == "hero":
    st.markdown("<p style='text-align:center; color:#ff4d4d;'>🚀 AI-POWERED • GAMIFIED • HACKATHON-READY</p>", unsafe_allow_html=True)
    st.markdown("<h1 class='hero-title'>From Fresher</h1>", unsafe_allow_html=True)
    st.markdown("<h1 class='hero-subtitle'>To Finalist.</h1>", unsafe_allow_html=True)
    
    with st.container():
        st.markdown("<div style='max-width:500px; margin:auto; background:#111; padding:30px; border-radius:20px; border:1px solid #222;'>", unsafe_allow_html=True)
        name = st.text_input("Enter Operator Name", key="name_input")
        if st.button("🚀 INITIALIZE JOURNEY"):
            if name:
                st.session_state.user_name = name
                st.session_state.flow = "dashboard"
                st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

# STAGE 2: THE CONVERSATIONAL DASHBOARD
elif st.session_state.flow == "dashboard":
    st.markdown(f"<div><span class='badge'>👤 {st.session_state.user_name}</span></div>", unsafe_allow_html=True)
    
    col_t, col_m = st.columns([1, 1.4])
    
    with col_t:
        st.subheader("📡 Mentor Terminal")
        chat_container = st.container(height=500)
        with chat_container:
            if not st.session_state.messages:
                st.session_state.messages.append({"role": "assistant", "content": f"Welcome, {st.session_state.user_name}. I am AgentForge. What fields interest you? We can explore Web Dev, AI, Robotics, or anything else."})
            for m in st.session_state.messages:
                with st.chat_message(m["role"]): st.write(m["content"])
        
        if prompt := st.chat_input("I want to learn..."):
            with st.chat_message("user"): st.write(prompt)
            st.session_state.messages.append({"role": "user", "content": prompt})
            
            with st.chat_message("assistant"):
                reply = call_mentor_ai(prompt, st.session_state.messages[:-1])
                st.write(reply)
                st.session_state.messages.append({"role": "assistant", "content": reply})
            st.rerun()

    with col_m:
        st.subheader("📊 8-Domain Matrix")
        if not st.session_state.matrix_active:
            st.info("The Matrix will unlock once we define your project path in the terminal.")
        
        c1, c2 = st.columns(2)
        for i, (k, v) in enumerate(st.session_state.matrix.items()):
            target = c1 if i % 2 == 0 else c2
            with target:
                st.markdown(f"<div class='matrix-card'><div class='matrix-header'>💠 {k.replace('_',' ').title()}</div><pre>{v}</pre></div>", unsafe_allow_html=True)