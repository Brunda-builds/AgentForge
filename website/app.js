/**
 * AgentForge - Main Application Logic
 */

// ==========================================
// STATE & PROGRESS METRICS
// ==========================================
const state = {
  score: 0,
  interviewReadiness: 0,
  skillCompletion: 0,
  unlockedBadges: new Set(),
  stepsCompleted: 0
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const els = {
  nav: document.getElementById('nav'),
  tabs: document.querySelectorAll('.tab-btn'),
  panels: document.querySelectorAll('[role="tabpanel"]'),
  metrics: {
    code: document.getElementById('prog-code'),
    codeVal: document.getElementById('metric-code-val'),
    interview: document.getElementById('prog-interview'),
    interviewVal: document.getElementById('metric-interview-val'),
    skill: document.getElementById('prog-skill'),
    skillVal: document.getElementById('metric-skill-val')
  },
  toast: document.getElementById('feedback-toast')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initScrollEffects();
  unlockBadge('first-step');
  
  // Confetti resize listener
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();
  
  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      if (this.getAttribute('href') !== '#') {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Reveal elements on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  
  // Session ID generation (fallback for file:/// protocol as crypto might be locked)
  const generateUUID = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  let currentSessionId = generateUUID();
  let currentTopic = '';

  // Hero Start Button
  document.getElementById('hero-start-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('userName').value.trim();
    const topic = document.getElementById('userTopic').value.trim();
    const level = document.getElementById('userLevel').value;
    const idea = document.getElementById('userIdea').value.trim() || "";

    if (!name || !topic) {
      showToast('Please fill out Name and Topic before starting!', 'error');
      return;
    }

    // Reset session memory if topic changes
    if (topic !== currentTopic) {
      currentSessionId = generateUUID();
      currentTopic = topic;
    }

    // Clear Left Chat Panels
    document.getElementById('msgs-assess').innerHTML = '';
    document.getElementById('msgs-roadmap').innerHTML = '';
    document.getElementById('msgs-ideas').innerHTML = '';
    document.getElementById('msgs-codegen').innerHTML = '';
    document.getElementById('msgs-debug').innerHTML = '';
    document.getElementById('msgs-explain').innerHTML = '';
    document.getElementById('msgs-judge').innerHTML = '';
    document.getElementById('msgs-demo').innerHTML = '';

    // Clear Right Panels (Dashboard) before new generation
    document.getElementById('skill-profile-content').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Loading Profile...</div>';
    document.getElementById('roadmap-nodes').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Generating Path...</div>';
    document.getElementById('ideas-output').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Brainstorming...</div>';
    document.getElementById('codegen-output').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Writing Code...</div>';
    document.getElementById('debug-output').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Hunting Bugs...</div>';
    document.getElementById('explain-output').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Analyzing Code...</div>';
    document.getElementById('judge-output').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Preparing Questions...</div>';
    document.getElementById('demo-terminal-window').innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-muted)">Booting Stage...</div>';

    document.getElementById('loading-modal').style.display = 'flex';

    try {
      const payload = {
        session_id: currentSessionId,
        name: name,
        topic: topic,
        skill_level: level,
        hackathon_idea: idea,
        user_message: `Hi, I am ${name}. I am a ${level}. I want to build a ${topic} project with the idea: ${idea}.`
      };

      const response = await fetch('http://localhost:8000/start_journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      populateDashboard(data, { name, topic, level, idea });

      document.getElementById('loading-modal').style.display = 'none';
      showToast('Journey Started! AI Mentor is ready.', 'success');
      document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      document.getElementById('loading-modal').style.display = 'none';
      showToast('Error: Could not connect to API.', 'error');
    }
  });
});

// ==========================================
// BACKEND DATA POPULATION Function
// ==========================================
function populateDashboard(data, inputs) {
  // 1. Skill Assessment
  completeStep('assess');
  unlockBadge('skill-assessed');
  document.getElementById('skill-profile-content').innerHTML = `
    <div class="idea-card">
      <div class="idea-num">PROFILE DETECTED</div>
      <div class="idea-title" style="color:var(--lime);font-size:1.4rem">${inputs.topic} Track</div>
      <p class="idea-desc">${data.skill_assessment || 'Assessment completed based on ' + inputs.level + ' level.'}</p>
      <div class="level-meter">
        <div class="level-label">Current Hackathon Readiness: 20%</div>
        <div class="level-bar"><div class="level-fill" style="width:20%"></div></div>
      </div>
    </div>
  `;
  appendMessage('msgs-assess', `Alright ${inputs.name}, let's build something real. Check the right panel for your breakdown.`);

  // 2. Roadmap
  completeStep('roadmap');
  unlockBadge('roadmap');
  document.getElementById('roadmap-nodes').innerHTML = `
    <div style="padding: 16px; color: var(--text-primary); font-size: 0.9rem; white-space: pre-wrap; line-height: 1.6;">${data.roadmap || 'Roadmap generated.'}</div>
  `;
  appendMessage('msgs-roadmap', `Here’s the architecture map. Follow this step-by-step.`);

  // 3. Project Ideas
  completeStep('ideas');
  unlockBadge('ideas');
  document.getElementById('ideas-output').innerHTML = `
    <div style="padding: 16px; color: var(--text-primary); font-size: 0.9rem; white-space: pre-wrap; line-height: 1.6;">${data.project_ideas || 'Ideas generated.'}</div>
  `;
  appendMessage('msgs-ideas', `Forget generic ideas. Here are three technical implementations to try.`);

  // 4. Code Generation
  completeStep('codegen');
  unlockBadge('coder');
  updateMetrics('code', 20);
  document.getElementById('codegen-output').innerHTML = `
    <div class="code-output">
      <div class="code-header"><div class="code-lang">STARTER CODE</div><button class="btn-copy" onclick="copyCode('generated-code')">📋 Copy</button></div>
      <div class="code-body" id="generated-code" style="white-space: pre-wrap;">${data.generated_code || '# Code generated here.'}</div>
    </div>
  `;
  appendMessage('msgs-codegen', `I’ve pushed the boilerplate over. Let's compile.`);

  // 5. Debug Code
  completeStep('debug');
  unlockBadge('debugger');
  updateMetrics('code', 30);
  document.getElementById('debug-output').innerHTML = `
    <div class="code-output glow-correct">
      <div class="code-header"><div class="code-lang">DEBUGGING CONTEXT</div></div>
      <div class="code-body" style="white-space: pre-wrap;">${data.debugged_code || 'Code successfully debugged.'}</div>
    </div>
  `;
  appendMessage('msgs-debug', `Found a race condition or bug here. Review the diff.`);

  // 6. Explain Code
  completeStep('explain');
  unlockBadge('explainer');
  document.getElementById('explain-output').innerHTML = `
    <div class="q-card">
      <div class="q-sample" style="color:var(--text-primary); font-size:0.9rem; white-space: pre-wrap;">${data.code_explanation || 'Code Explained.'}</div>
    </div>
  `;
  appendMessage('msgs-explain', `Here's what that code is actually doing under the hood.`);

  // 7. Judge Questions
  completeStep('judge');
  unlockBadge('judge');
  document.getElementById('judge-output').innerHTML = `
    <div style="padding: 16px; color: var(--text-primary); font-size: 0.9rem; white-space: pre-wrap; line-height: 1.6;">${data.judge_questions || 'Judge Questions generated.'}</div>
  `;
  appendMessage('msgs-judge', `Judges will try to break your logic. Master these answers.`);

  // 8. Demo Simulation
  completeStep('demo');
  unlockBadge('demo');
  document.getElementById('demo-screen').innerHTML = `
    <div class="demo-terminal" id="demo-terminal-window" style="white-space: pre-wrap;">${data.demo_simulation || 'Demo Simulation Details'}</div>
  `;
  appendMessage('msgs-demo', `I drafted a 3-step live demo script. Keep it tight.`);
  
  fireConfetti(100);
}

// ==========================================
// UI EFFECTS & INTERACTIVITY
// ==========================================

function initScrollEffects() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      els.nav.classList.add('scrolled');
    } else {
      els.nav.classList.remove('scrolled');
    }
  });
}

function initTabs() {
  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      els.tabs.forEach(t => t.classList.remove('active'));
      els.panels.forEach(p => p.classList.add('hidden'));
      
      // Add active to clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('aria-controls');
      document.getElementById(targetId).classList.remove('hidden');
    });
  });
}

// ==========================================
// TOAST & FEEDBACK SYSTEM
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  els.toast.appendChild(toast);

  // Animate Out & Remove
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function showThumbsUp(element) {
  const rect = element.getBoundingClientRect();
  const reaction = document.createElement('div');
  reaction.className = 'reaction-float';
  reaction.innerHTML = '👍';
  reaction.style.left = `${rect.left + (rect.width / 2) - 16}px`;
  reaction.style.top = `${rect.top - 20}px`;
  document.body.appendChild(reaction);
  
  setTimeout(() => reaction.remove(), 1500);
}

function updateMetrics(type, amount) {
  if (type === 'code') {
    state.score = Math.min(100, state.score + amount);
    els.metrics.code.style.width = `${state.score}%`;
    els.metrics.codeVal.innerText = `${state.score}%`;
  }
  else if (type === 'interview') {
    state.interviewReadiness = Math.min(100, state.interviewReadiness + amount);
    els.metrics.interview.style.width = `${state.interviewReadiness}%`;
    els.metrics.interviewVal.innerText = `${state.interviewReadiness}%`;
  }
  else if (type === 'skill') {
    state.skillCompletion = Math.min(100, Math.floor(((state.stepsCompleted || 0) / 7) * 100));
    els.metrics.skill.style.width = `${state.skillCompletion}%`;
    els.metrics.skillVal.innerText = `${state.skillCompletion}%`;
  }
  
  if (state.score === 100 && state.interviewReadiness === 100 && state.skillCompletion === 100) {
    unlockBadge('finalist');
    fireConfetti();
  }
}

function unlockBadge(badgeId) {
  if (state.unlockedBadges.has(badgeId)) return;
  state.unlockedBadges.add(badgeId);
  
  const badgeEl = document.getElementById(`badge-${badgeId}`);
  if (badgeEl) {
    badgeEl.classList.remove('locked');
    badgeEl.classList.add('unlocked');
    showToast(`Achievement Unlocked: ${badgeEl.querySelector('.badge-name').innerText} 🏆`, 'success');
    fireConfetti(30);
  }
}

// Mark a tab as completed with a green dot
function completeStep(tabId) {
  const tab = document.getElementById(`tab-${tabId}`);
  if (tab && !tab.classList.contains('completed')) {
    tab.classList.add('completed');
    state.stepsCompleted++;
    updateMetrics('skill', 0); // recalculates based on stepsCompleted
  }
}

// ==========================================
// CHAT UTILS
// ==========================================
function appendMessage(containerId, text, isUser = false) {
  const container = document.getElementById(containerId);
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user' : 'ai'}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerText = isUser ? '👤' : '🤖';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = text; // allow HTML
  
  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  
  // Remove typing indicator if AI message
  if (!isUser) {
    const typingMsg = container.querySelector('.typing-msg');
    if (typingMsg) typingMsg.remove();
  }
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator(containerId) {
  const container = document.getElementById(containerId);
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message ai typing-msg';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerText = '🤖';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble typing-indicator';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  
  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function quickSend(tab, text) {
  const input = document.getElementById(`input-${tab}`);
  if (input) {
    input.value = text;
    // Map tab to its send function
    const fnMap = {
      'roadmap': sendRoadmapMessage,
      'ideas': sendIdeasMessage,
      'codegen': sendCodegenMessage,
      'judge': sendJudgeMessage,
      'demo': sendDemoMessage
    };
    if (fnMap[tab]) fnMap[tab]();
  }
}

// ==========================================
// TAB: ASSESS SKILLS
// ==========================================
function selectSkill(element) {
  document.querySelectorAll('.skill-item').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
  const skill = element.getAttribute('data-skill');
  document.getElementById('input-assess').value = skill;
  sendAssessMessage();
}

function sendAssessMessage() {
  const input = document.getElementById('input-assess');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-assess', text, true);
  input.value = '';
  showTypingIndicator('msgs-assess');
  
  setTimeout(() => {
    appendMessage('msgs-assess', `Great! So you're interested in <strong>${text}</strong>. I've analyzed standard requirements for this domain and created a baseline assessment. <br><br>Let's map out your roadmap next!`);
    
    // Update Right Panel UI
    setTimeout(() => {
      const output = document.getElementById('skill-profile-content');
      output.innerHTML = `
        <div class="idea-card" style="animation: scaleIn 0.4s ease forwards;">
          <div class="idea-num">PROFILE DETECTED</div>
          <div class="idea-title" style="color:var(--lime);font-size:1.4rem">${text} Track</div>
          <p class="idea-desc">Based on your selection, we've mapped the core competencies required to win a hackathon in this domain.</p>
          
          <div class="skill-grid" style="pointer-events:none;">
            <div class="skill-item selected"><span class="skill-emoji">🏗️</span><span class="skill-name">Fundamentals</span></div>
            <div class="skill-item"><span class="skill-emoji">⚙️</span><span class="skill-name">Frameworks</span></div>
            <div class="skill-item"><span class="skill-emoji">🔌</span><span class="skill-name">API Integration</span></div>
            <div class="skill-item"><span class="skill-emoji">🚀</span><span class="skill-name">Deployment</span></div>
          </div>
          
          <div class="level-meter">
            <div class="level-label">Current Hackathon Readiness: 20% (Beginner)</div>
            <div class="level-bar"><div class="level-fill" style="width:20%"></div></div>
          </div>
        </div>
      `;
      unlockBadge('skill-assessed');
      completeStep('assess');
    }, 500);
    
  }, 1200);
}

// ==========================================
// TAB: ROADMAP
// ==========================================
function sendRoadmapMessage() {
  const input = document.getElementById('input-roadmap');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-roadmap', text, true);
  input.value = '';
  showTypingIndicator('msgs-roadmap');
  
  setTimeout(() => {
    appendMessage('msgs-roadmap', `I've generated a <strong>visual roadmap</strong> based on a "${text}" timeline. Check the right panel! <br><br>Complete each step to level up.`);
    
    // Update Right Panel UI
    setTimeout(() => {
      document.getElementById('roadmap-progress-label').innerText = '0 / 4 steps';
      const output = document.getElementById('roadmap-nodes');
      output.innerHTML = `
        <div class="roadmap-content" style="padding:0">
          <div class="roadmap-node active" id="node-1" onclick="completeNode(1)">
            <div class="node-circle">1</div>
            <div class="node-info">
              <div class="node-title">Environment Setup <span class="node-status-badge badge-active">CURRENT</span></div>
              <div class="node-desc">Install essential tools, IDEs, and dependencies for your stack.</div>
            </div>
          </div>
          <div class="roadmap-node" id="node-2" onclick="completeNode(2)">
            <div class="node-circle">2</div>
            <div class="node-info">
              <div class="node-title">Core Logic & API <span class="node-status-badge badge-locked">LOCKED</span></div>
              <div class="node-desc">Build the backend logic and integrate external AI APIs.</div>
            </div>
          </div>
          <div class="roadmap-node" id="node-3" onclick="completeNode(3)">
            <div class="node-circle">3</div>
            <div class="node-info">
              <div class="node-title">Frontend UI/UX <span class="node-status-badge badge-locked">LOCKED</span></div>
              <div class="node-desc">Create a dynamic, user-friendly interface.</div>
            </div>
          </div>
          <div class="roadmap-node" id="node-4" onclick="completeNode(4)">
            <div class="node-circle">4</div>
            <div class="node-info">
              <div class="node-title">Pitch & Deployment <span class="node-status-badge badge-locked">LOCKED</span></div>
              <div class="node-desc">Host your project live and practice your presentation.</div>
            </div>
          </div>
        </div>
      `;
      unlockBadge('roadmap');
      completeStep('roadmap');
    }, 500);
  }, 1500);
}

function completeNode(num) {
  const node = document.getElementById(`node-${num}`);
  if (!node || node.classList.contains('done')) return;
  
  if (!node.classList.contains('active')) {
    showToast("Complete previous steps first!", "error");
    return;
  }
  
  // Mark current as done
  node.classList.remove('active');
  node.classList.add('done');
  node.querySelector('.node-status-badge').className = "node-status-badge badge-done";
  node.querySelector('.node-status-badge').innerText = "DONE";
  showThumbsUp(node.querySelector('.node-circle'));
  
  // Update progress
  updateMetrics('skill', 0); // Skill completion progresses slightly
  
  // Activate next node
  const nextNode = document.getElementById(`node-${num + 1}`);
  if (nextNode) {
    nextNode.classList.add('active');
    nextNode.querySelector('.node-status-badge').className = "node-status-badge badge-active";
    nextNode.querySelector('.node-status-badge').innerText = "CURRENT";
  } else {
    // All done
    showToast("Roadmap completed! 🚀", "success");
    fireConfetti();
  }
  
  const completed = document.querySelectorAll('.roadmap-node.done').length;
  document.getElementById('roadmap-progress-label').innerText = `${completed} / 4 steps`;
}

// ==========================================
// TAB: PROJECT IDEAS
// ==========================================
function sendIdeasMessage() {
  const input = document.getElementById('input-ideas');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-ideas', text, true);
  input.value = '';
  showTypingIndicator('msgs-ideas');
  
  setTimeout(() => {
    appendMessage('msgs-ideas', `Awesome domain: <strong>${text}</strong>!<br><br>I've brainstormed 3 winning project concepts. Pick one and let's start coding!`);
    
    // Update Right Panel UI
    setTimeout(() => {
      const output = document.getElementById('ideas-output');
      output.innerHTML = `
        <div class="idea-card">
          <div class="idea-num">IDEA_001</div>
          <div class="idea-title">EcoScanner AI</div>
          <div class="idea-desc">An app that uses GenAI vision to scan household items and provide recycling instructions and sustainability scores.</div>
          <div class="idea-tags">
            <span class="idea-tag">Computer Vision</span>
            <span class="idea-tag">Mobile App</span>
            <span class="idea-tag">Sustainability</span>
          </div>
        </div>
        <div class="idea-card">
          <div class="idea-num">IDEA_002</div>
          <div class="idea-title">NeuroFocus Dashboard</div>
          <div class="idea-desc">A productivity dashboard that analyzes webcam frames to detect user fatigue and suggests micro-breaks using AI.</div>
          <div class="idea-tags">
            <span class="idea-tag">WebRTC</span>
            <span class="idea-tag">Python Flask</span>
            <span class="idea-tag">HealthTech</span>
          </div>
        </div>
        <div class="idea-card">
          <div class="idea-num">IDEA_003</div>
          <div class="idea-title">SignLingo Bridge</div>
          <div class="idea-desc">Real-time sign language to text translator using standard webcams and lightweight ML models entirely in the browser.</div>
          <div class="idea-tags">
            <span class="idea-tag">TensorFlow.js</span>
            <span class="idea-tag">Accessibility</span>
            <span class="idea-tag">React</span>
          </div>
        </div>
      `;
      unlockBadge('ideas');
      completeStep('ideas');
    }, 600);
  }, 1400);
}

// ==========================================
// TAB: CODE GENERATION
// ==========================================
function sendCodegenMessage() {
  const input = document.getElementById('input-codegen');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-codegen', text, true);
  input.value = '';
  showTypingIndicator('msgs-codegen');
  
  setTimeout(() => {
    appendMessage('msgs-codegen', `I've forged the code for you! ⚙️<br><br>It's optimized and ready to connect to your project.`);
    
    // Update Right Panel UI
    setTimeout(() => {
      const output = document.getElementById('codegen-output');
      output.innerHTML = `
        <div class="code-output">
          <div class="code-header">
            <div class="code-lang">PYTHON / FLASK</div>
            <button class="btn-copy" onclick="copyCode('generated-code')">📋 Copy</button>
          </div>
          <div class="code-body" id="generated-code"><span class="code-keyword">import</span> os
<span class="code-keyword">from</span> flask <span class="code-keyword">import</span> Flask, request, jsonify
<span class="code-keyword">import</span> google.generativeai <span class="code-keyword">as</span> genai

<span class="code-comment"># Configure the Gemini API</span>
api_key = os.getenv(<span class="code-string">"GEMINI_API_KEY"</span>)
genai.configure(api_key=api_key)

app = Flask(__name__)
model = genai.GenerativeModel(<span class="code-string">"gemini-1.5-flash"</span>)

<span class="code-keyword">@app</span>.route(<span class="code-string">"/api/chat"</span>, methods=[<span class="code-string">"POST"</span>])
<span class="code-keyword">def</span> <span class="code-func">chat_endpoint</span>():
    data = request.get_json()
    user_message = data.get(<span class="code-string">"message"</span>)
    
    <span class="code-keyword">if not</span> user_message:
        <span class="code-keyword">return</span> jsonify({<span class="code-string">"error"</span>: <span class="code-string">"Message missing"</span>}), <span class="code-num">400</span>
        
    <span class="code-comment"># Generate a response</span>
    response = model.generate_content(user_message)
    
    <span class="code-keyword">return</span> jsonify({
        <span class="code-string">"response"</span>: response.text,
        <span class="code-string">"status"</span>: <span class="code-string">"success"</span>
    })

<span class="code-keyword">if</span> __name__ == <span class="code-string">"__main__"</span>:
    app.run(debug=<span class="code-num">True</span>, port=<span class="code-num">5000</span>)</div>
        </div>
      `;
      unlockBadge('coder');
      completeStep('codegen');
      updateMetrics('code', 30);
    }, 800);
  }, 1800);
}

// ==========================================
// TAB: DEBUG
// ==========================================
function loadBuggyCode() {
  document.getElementById('input-debug').value = `def calculate_average(numbers):
    total = sum(numbers)
    # Bug: division by zero if list is empty
    return total / len(numbers)
    
nums = []
print(calculate_average(nums))`;
}

function clearInput(tab) {
  document.getElementById(`input-${tab}`).value = '';
}

function sendDebugMessage() {
  const input = document.getElementById('input-debug');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-debug', `<pre style="font-size:0.75rem;margin:0;max-width:100%;overflow-x:hidden;">${text}</pre>`, true);
  input.value = '';
  showTypingIndicator('msgs-debug');
  
  setTimeout(() => {
    appendMessage('msgs-debug', `I found the bug! 🐛<br><br>The code crashes if the list is empty (ZeroDivisionError). I've updated it to check for empty lists and highlighted the fix.`);
    
    // Update Right Panel UI
    setTimeout(() => {
      const output = document.getElementById('debug-output');
      output.innerHTML = `
        <div class="code-output glow-correct">
          <div class="code-header">
            <div class="code-lang">DIFF OVERVIEW</div>
          </div>
          <div class="code-body" id="debug-fix-code" style="max-height:400px"><span class="diff-ctx">def calculate_average(numbers):</span>
<span class="diff-add">+   if not numbers:</span>
<span class="diff-add">+       return 0  # Handle empty list case gracefully</span>
<span class="diff-ctx">    total = sum(numbers)</span>
<span class="diff-del">-   return total / len(numbers)</span>
<span class="diff-add">+   return total / len(numbers)</span>
<span class="diff-ctx">    </span>
<span class="diff-ctx">nums = []</span>
<span class="diff-ctx">print(calculate_average(nums))</span></div>
        </div>
      `;
      unlockBadge('debugger');
      completeStep('debug');
      updateMetrics('code', 40);
    }, 600);
  }, 1600);
}

// ==========================================
// TAB: EXPLAIN CODE
// ==========================================
function loadExplainSample() {
  document.getElementById('input-explain').value = `[x for x in range(10) if x % 2 == 0]`;
}

function sendExplainMessage() {
  const input = document.getElementById('input-explain');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-explain', `<pre style="font-size:0.75rem;margin:0">${text}</pre>`, true);
  input.value = '';
  showTypingIndicator('msgs-explain');
  
  setTimeout(() => {
    appendMessage('msgs-explain', `Here is the line-by-line translation of that code! 📖`);
    
    // Update Right Panel UI
    setTimeout(() => {
      const output = document.getElementById('explain-output');
      output.innerHTML = `
        <div class="q-card">
          <div class="q-text" style="font-family:var(--font-code); color:var(--blue-bright)">[x for x in range(10) if x % 2 == 0]</div>
          <div class="q-sample" style="color:var(--text-primary); font-size:0.9rem">
            This is a Python <strong>List Comprehension</strong>. It does three things at once:<br><br>
            <strong>1.</strong> <span style="color:var(--lime)">range(10)</span>: Generates numbers from 0 to 9.<br>
            <strong>2.</strong> <span style="color:var(--lime)">if x % 2 == 0</span>: Checks if the number is even.<br>
            <strong>3.</strong> <span style="color:var(--lime)">x</span>: Adds that even number to a new list.<br><br>
            <strong>Result:</strong> <code>[0, 2, 4, 6, 8]</code>
          </div>
        </div>
      `;
      unlockBadge('explainer');
      completeStep('explain');
      updateMetrics('code', 30);
    }, 800);
  }, 1500);
}

// ==========================================
// TAB: JUDGE QUESTIONS
// ==========================================
function sendJudgeMessage() {
  const input = document.getElementById('input-judge');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-judge', text, true);
  input.value = '';
  showTypingIndicator('msgs-judge');
  
  setTimeout(() => {
    appendMessage('msgs-judge', `I've analyzed your project: <strong>${text}</strong>.<br><br>I generated the top 3 most likely questions a technical judge will ask you. Practice answering them in the right panel! ⚖️`);
    
    // Update Right Panel UI
    setTimeout(() => {
      document.getElementById('judge-score-label').innerText = 'Answer to reveal score';
      const output = document.getElementById('judge-output');
      output.innerHTML = `
        <div class="q-card" id="q-eval-1">
          <div class="q-number">1</div>
          <div class="q-text">What happens if the Gemini AI API goes down or rate limits you during a live presentation?</div>
          <input type="text" class="q-answer-input" placeholder="Type your answer here to validate..." onkeypress="checkJudgeAnswer(event, 1)">
          <div class="q-sample" style="display:none" id="q-hint-1"><strong>AI Feedback:</strong> Good answers mention error handling, fallback caching mechanisms, or graceful UI degradation.</div>
        </div>

        <div class="q-card" id="q-eval-2">
          <div class="q-number">2</div>
          <div class="q-text">How are you ensuring user data privacy within this architecture?</div>
          <input type="text" class="q-answer-input" placeholder="Type your answer here to validate..." onkeypress="checkJudgeAnswer(event, 2)">
          <div class="q-sample" style="display:none" id="q-hint-2"><strong>AI Feedback:</strong> Mention not storing personal data, using environment variables for keys, and securing endpoints.</div>
        </div>

        <div class="q-card">
          <div class="q-number">3</div>
          <div class="q-text">Why did you choose this tech stack instead of alternatives (like React vs Vue or Python vs Node)?</div>
          <input type="text" class="q-answer-input" placeholder="Type your answer here to validate..." onkeypress="checkJudgeAnswer(event, 3)">
          <div class="q-sample" style="display:none" id="q-hint-3"><strong>AI Feedback:</strong> Be honest! Say you picked it for speed, developer familiarity, or specific library support.</div>
        </div>
      `;
      unlockBadge('judge');
      completeStep('judge');
    }, 1000);
  }, 1800);
}

function checkJudgeAnswer(e, num) {
  if (e.key === 'Enter') {
    const input = e.target;
    const text = input.value.trim();
    if (text.length > 10) {
      input.style.borderColor = 'var(--lime)';
      input.style.color = 'var(--lime)';
      input.disabled = true;
      document.getElementById(`q-hint-${num}`).style.display = 'block';
      
      updateMetrics('interview', 33);
      if (document.getElementById(`q-eval-1`).querySelector('input').disabled && document.getElementById(`q-eval-2`).querySelector('input').disabled) {
          document.getElementById('judge-score-label').innerText = 'Score: 98/100 (Judge Ready!)';
          document.getElementById('judge-score-label').style.color = 'var(--lime)';
          updateMetrics('interview', 34);
      }
      showThumbsUp(input);
    } else {
      showToast('Answer needs to be more detailed!', 'error');
    }
  }
}

// ==========================================
// TAB: DEMO SIMULATION
// ==========================================
function sendDemoMessage() {
  const input = document.getElementById('input-demo');
  const text = input.value.trim();
  if (!text) return;
  
  appendMessage('msgs-demo', text, true);
  input.value = '';
  showTypingIndicator('msgs-demo');
  
  setTimeout(() => {
    appendMessage('msgs-demo', `Demo scenario loaded for: <strong>${text}</strong>.<br><br>Hit 'Start Demo' on the stage to begin the simulation. I'll critique your timing and impact! 🎮`);
    
    // Update Right Panel UI
    setTimeout(() => {
      document.getElementById('demo-screen').innerHTML = `
        <div class="demo-terminal" id="demo-terminal-window">
          <div class="demo-line prompt">$ init_demo --project="Hackathon Build"</div>
          <div class="demo-line output">Waiting for user to start demo sequence...</div>
          <span class="demo-cursor"></span>
        </div>
      `;
      unlockBadge('demo');
      completeStep('demo');
    }, 600);
  }, 1200);
}

let demoInterval;
function startDemo() {
  const term = document.getElementById('demo-terminal-window');
  if (!term) return; // ensure initialized
  
  const btn = document.getElementById('btn-start-demo');
  btn.disabled = true;
  btn.innerText = "Demo Running...";
  
  let time = 0;
  const timerEl = document.getElementById('demo-timer');
  
  const seq = [
    { t: 1, c: '<div class="demo-line output">[0:01] Presenter: "Hello judges! Let me show you the core feature."</div>' },
    { t: 3, c: '<div class="demo-line prompt">$ python run_core_module.py</div>' },
    { t: 5, c: '<div class="demo-line output">[0:05] Module loaded. Processing request...</div>' },
    { t: 7, c: '<div class="demo-line success">[0:07] Action successful! Response time: 1.2s</div>' },
    { t: 9, c: '<div class="demo-line output">[0:09] ℹ️ AI Tip: Great speed! Emphasize this response time to the judges.</div>' },
    { t: 11, c: '<div class="demo-line success">[0:11] 🏆 Demo sequence complete. Judge Impression: ★★★★★</div>' }
  ];
  
  demoInterval = setInterval(() => {
    time++;
    timerEl.innerText = `00:${time < 10 ? '0'+time : time}`;
    
    const s = seq.find(x => x.t === time);
    if (s) {
      const cursor = term.querySelector('.demo-cursor');
      if (cursor) cursor.remove();
      
      term.innerHTML += s.c + '<span class="demo-cursor"></span>';
      term.scrollTop = term.scrollHeight;
    }
    
    if (time >= 12) {
      clearInterval(demoInterval);
      btn.innerText = "Demo Finished";
      term.style.borderColor = "var(--lime)";
      term.style.boxShadow = "0 0 20px var(--lime-glow)";
      fireConfetti(50);
      showToast("Demo Simulation Passed!", "success");
      updateMetrics('interview', 100);
    }
  }, 1000);
}

function resetDemo() {
  clearInterval(demoInterval);
  document.getElementById('demo-timer').innerText = "00:00";
  const btn = document.getElementById('btn-start-demo');
  if (btn) {
    btn.disabled = false;
    btn.innerText = "▶ Start Demo";
  }
  const term = document.getElementById('demo-terminal-window');
  if (term) {
    term.innerHTML = `
      <div class="demo-line prompt">$ init_demo --reset</div>
      <div class="demo-line output">Demo reset. Ready to start again.</div>
      <span class="demo-cursor"></span>
    `;
    term.style.boxShadow = "none";
    term.style.borderColor = "var(--border)";
  }
}

// ==========================================
// UTILS
// ==========================================
function copyCode(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  // Use innerText to avoid copying HTML tags, removing diff spans
  let code = el.innerText; 
  navigator.clipboard.writeText(code).then(() => {
    const btn = el.previousElementSibling?.querySelector('.btn-copy') || event.target;
    const oldText = btn.innerText;
    btn.innerText = "✅ Copied!";
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerText = oldText;
      btn.classList.remove('copied');
    }, 2000);
    showToast('Code copied to clipboard', 'info');
  });
}

// ==========================================
// CONFETTI ENGINE
// ==========================================
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const colors = ['#007BFF', '#32FF7E', '#9c5fff', '#ffffff'];

function resizeConfetti() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function fireConfetti(duration = 200) {
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight;
  
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: originX,
      y: originY,
      r: Math.random() * 6 + 2,
      dx: Math.random() * 20 - 10,
      dy: Math.random() * -15 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleInc: (Math.random() * 0.07) + 0.05,
      tiltAngle: 0
    });
  }
  
  if (particles.length <= 100) {
    requestAnimationFrame(renderConfetti);
  }
}

function renderConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.tiltAngle += p.tiltAngleInc;
    p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
    p.x += Math.sin(p.tiltAngle) * 2;
    p.dy += 0.2; // gravity
    p.x += p.dx;
    p.y += p.dy;
    
    ctx.beginPath();
    ctx.lineWidth = p.r;
    ctx.strokeStyle = p.color;
    ctx.moveTo(p.x + p.tilt + p.r, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
    ctx.stroke();
  }
  
  particles = particles.filter(p => p.y < canvas.height + 10 && p.x > -10 && p.x < canvas.width + 10);
  
  if (particles.length > 0) {
    requestAnimationFrame(renderConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
