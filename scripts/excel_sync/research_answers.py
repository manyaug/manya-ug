import os
from supabase import create_client, Client

url = "https://pmgdfuhqgwysequaopts.supabase.co"
key = "sb_secret_YOUR_KEY_HERE"
supabase: Client = create_client(url, key)

def research_answers():
    print("🔍 [Research] Checking English Answer Formats in Supabase...")
    
    # 1. Fetch some rows from questions_english
    res = supabase.table("questions_english").select("qid,correctanswer,optiona,optionb,optionc,optiond").limit(5).execute()
    
    if res.data:
        for row in res.data:
            print(f"--- {row['qid']} ---")
            print(f"  CorrectAnswer: '{row['correctanswer']}'")
            print(f"  Options: ['{row['optiona']}', '{row['optionb']}', '{row['optionc']}', '{row['optiond']}']")
    else:
        print("❌ No questions found in Supabase.")

if __name__ == "__main__":
    research_answers()
