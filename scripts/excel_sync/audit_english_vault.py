import os
from supabase import create_client
from dotenv import load_dotenv

def audit_vault():
    load_dotenv(r"d:\manya_app\scripts\excel_sync\.env")
    s_url = os.getenv("SUPABASE_URL")
    s_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(s_url, s_key)
    
    types = ["QUEST", "MCQ", "SIMULATION", "NOTE", "GRAMMAR"]
    print("--- ENGLISH VAULT AUDIT ---")
    
    for t in types:
        res = supabase.table('manya_vault').select('qid, subtopic, question_text').eq('subject', 'ENGLISH').eq('item_type', t).limit(3).execute()
        print(f"\n[TYPE: {t}] - Found: {len(res.data)} samples")
        for item in res.data:
            print(f"  > QID: {item['qid']} | Subtopic: {item['subtopic']}")

if __name__ == "__main__":
    audit_vault()
