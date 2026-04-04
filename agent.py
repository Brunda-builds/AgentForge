import os, json, requests, streamlit as st
from dotenv import load_dotenv

# --- 1. SETTINGS & FULL CINEMATIC CSS ---
st.set_page_config(page_title="AgentForge AI", layout="wide", initial_sidebar_state="collapsed")
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

st.markdown("""
    <style>
    .stApp { background: #050505; color: #ffffff; font-family: 'Inter', sans-serif; }
    
    /* Hero Text Styling */
    .hero-title { font-size: 5rem; font-weight: 800; background: linear-gradient(90deg, #ffffff, #888888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; margin-top: 50px; }
    .hero-subtitle { font-size: 3.5rem; font-weight: 800; color: #ff4d4d; text-align: center; margin-top: -20px; text-shadow: 0 0 20px rgba(255,77,77,0.3); }
    
    /* Card/Matrix Styling */
    .matrix-card { background: #111111; border: 1px solid #333; border-radius: 12px; padding: 20px; height: 320px; overflow-y: auto; transition: 0.3s; }
    .matrix-card:hover { border-color: #ff4d4d; box-shadow: 0 0 15px rgba(255,77,77,0.1); }
    .matrix-header { color: #ff4d4d; font-weight: bold; border-bottom: 1px solid #222; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    
    /* Badges */
    .badge { padding: 5px 15px; border-radius: 30px; border: 1px solid #444; font-size: 0.8rem; background: rgba(255,255,255,0.05); }
    
    /* Buttons */
    .stButton>button { width: 100%; border-radius: 30px; background: linear-gradient(90deg, #ff4d4d, #ff0000); border: none; color: white; font-weight: bold; padding: 15px; }
    </style>
    """, unsafe_allow_html=True)

# --- 2. LOGIC: THE BRAIN ---
def call_mentor_ai(query, history):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={API_KEY}"
    system_prompt = "Act as a Hackathon Mentor. Respond ONLY with valid JSON. Keys: 'reply', 'skill_assessment', 'roadmap', 'project_ideas', 'generated_code', 'debugged_code', 'code_explanation', 'judge_questions', 'demo_simulation'."
    
    contents = [{"role": "user", "parts": [{"text": f"{system_prompt}\nUser Query: {query}"}]}]
    try:
        response = requests.post(url, json={"contents": contents}, verify=False, timeout=20)
        raw = response.json()['candidates'][0]['content']['parts'][0]['text'].strip().replace("```json", "").replace("```", "")
        parsed = json.loads(raw)
        for k in st.session_state.matrix:
            if k in parsed: st.session_state.matrix[k] = parsed[k]
        return parsed.get("reply", "Matrix Synchronized.")
    except: return "Connection unstable. Retrying synchronization..."

# --- 3. SESSION STATE ---
if "flow" not in st.session_state: st.session_state.flow = "hero"
if "matrix" not in st.session_state:
    st.session_state.matrix = {k: "Waiting for command..." for k in ["skill_assessment", "roadmap", "project_ideas", "generated_code", "debugged_code", "code_explanation", "judge_questions", "demo_simulation"]}
if "chat" not in st.session_state: st.session_state.chat = []

# --- 4. NAVIGATION FLOW ---

# STEP 0: THE HERO LANDING (From your video)
if st.session_state.flow == "hero":
    st.markdown("<p style='text-align:center; color:#ff4d4d; font-weight:bold;'>🚀 AI-Powered • Gamified • Hackathon-Ready</p>", unsafe_allow_html=True)
    st.markdown("<h1 class='hero-title'>From Fresher</h1>", unsafe_allow_html=True)
    st.markdown("<h1 class='hero-subtitle'>To Finalist.</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align:center; color:#888;'>The world's first Autonomous AI Mentor that builds your roadmap, validates your code, and predicts your interview.</p>", unsafe_allow_html=True)
    
    with st.container():
        st.markdown("<div style='background:#111; padding:30px; border-radius:20px; border:1px solid #222;'>", unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        with c1:
            name = st.text_input("Operator Name", placeholder="Your handle...")
            level = st.select_slider("Skill Level", ["Fresher", "Intermediate", "Pro"])
        with c2:
            field = st.selectbox("Topic / Interest", ["Hardware", "Software", "AI/ML", "Web3"])
            idea = st.text_input("Hackathon Idea", placeholder="e.g. Nutrient detection...")
        
        if st.button("🚀 START JOURNEY"):
            if name and idea:
                st.session_state.user_info = {"name": name, "field": field, "idea": idea}
                st.session_state.flow = "thinking"
                st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

# STEP 1: THE THINKING ANIMATION
elif st.session_state.flow == "thinking":
    st.markdown("<br><br><br><br><br><h1 style='text-align:center; color:#ff4d4d;'>⚡ AgentForge is Thinking...</h1>", unsafe_allow_html=True)
    st.markdown(f"<p style='text-align:center; color:#888;'>Analyzing project for {st.session_state.user_info['name']}...</p>", unsafe_allow_html=True)
    
    # Initialize the dashboard with the first auto-prompt
    initial_reply = call_mentor_ai(st.session_state.user_info['idea'], [])
    st.session_state.chat.append({"role": "assistant", "content": initial_reply})
    st.session_state.flow = "dashboard"
    st.rerun()

# STEP 2: THE WORKING MATRIX
elif st.session_state.flow == "dashboard":
    ui = st.session_state.user_info
    st.markdown(f"<div><span class='badge'>👤 {ui['name']}</span> <span class='badge'>🛠️ {ui['field']}</span> <span class='badge'>🎯 {ui['idea']}</span></div>", unsafe_allow_html=True)
    
    col_t, col_d = st.columns([1, 1.4])
    with col_t:
        st.title("🛰️ Terminal")
        for m in st.session_state.chat[-3:]:
            with st.chat_message(m["role"]): st.write(m["content"])
        
        if prompt := st.chat_input("Command the AI..."):
            st.session_state.chat.append({"role": "user", "content": prompt})
            reply = call_mentor_ai(prompt, st.session_state.chat)
            st.session_state.chat.append({"role": "assistant", "content": reply})
            st.rerun()

    with col_d:
        st.title("📊 8-Domain Matrix")
        c1, c2 = st.columns(2)
        for i, (k, v) in enumerate(st.session_state.matrix.items()):
            target = c1 if i % 2 == 0 else c2
            with target:
                st.markdown(f"<div class='matrix-card'><div class='matrix-header'>💠 {k.replace('_',' ').title()}</div><pre>{v}</pre></div>", unsafe_allow_html=True)