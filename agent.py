import os
from dotenv import load_dotenv

load_dotenv()


import json
import re
from google import genai

class HackBuddyDynamic:
    def __init__(self, api_key):
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-3.1-flash-lite-preview"
        
        # This acts as the "Brain" that remembers everything you've said
        self.memory = [] 
        
        # The System Persona: Tells the AI to be a Listener, not a Lecturer
        self.system_instruction = """
        You are 'HackBuddy', a mentor for 1st-year engineering students.
        
        YOUR CORE RULES:
        1. DO NOT give a full roadmap or code immediately.
        2. START by asking the student: 'What are you interested in?' or 'What do you want to learn?'
        3. ADAPT: If they say 'Software', suggest software skills. If they say 'Hardware', suggest that.
        4. MEMORIZE: Remember their name, interest, and skill level throughout the chat.
        5. CONCISE: Give short, clear answers. No long paragraphs.
        6. STEP-BY-STEP: Only give code when the student says they are ready for it.
        """

    def chat(self, user_input):
        try:
            # We use the 'chats' feature of the 2026 SDK to handle the memory automatically
            if not hasattr(self, 'session'):
                self.session = self.client.chats.create(
                    model=self.model_name,
                    config={"system_instruction": self.system_instruction}
                )
            
            response = self.session.send_message(user_input)
            return response.text
            
        except Exception as e:
            return f"[System Error]: {e}"

# ==============================
# RUNNING THE INTERACTIVE AGENT
# ==============================
if __name__ == "__main__":
    # Ensure your API Key is correct
    MY_API_KEY = os.getenv("GEMINI_API_KEY")
    buddy = HackBuddyDynamic(api_key=MY_API_KEY)

    print("--- 🚀 HACKBUDDY: YOUR PERSONAL MENTOR ---")
    print("Type 'exit' to stop the session.\n")
    
    # First Message from the AI to start the interview
    initial_prompt = "Hello! I am your hackathon mentor. Before we start, tell me: What are you interested in, and what is your current coding level?"
    print(f"HackBuddy: {initial_prompt}")

    while True:
        user_msg = input("You: ")
        
        if user_msg.lower() in ["exit", "quit", "stop"]:
            print("HackBuddy: Great chatting! Good luck with your learning journey.")
            break
            
        response = buddy.chat(user_msg)
        print(f"\nHackBuddy: {response}\n")