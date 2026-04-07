import os
from supabase import create_client, Client

url = "https://pmgdfuhqgwysequaopts.supabase.co"
key = "sb_secret_YOUR_KEY_HERE"
supabase: Client = create_client(url, key)

def research_specific():
    print("🔍 [Research] Investigating specific broken QIDs...")
    
    target_qids = ["PQ-ENG7-T1-00071-V2", "PQ-ENG7-T1-00071-V3", "PQ-ENG7-T1-00072-V1"]
    res = supabase.table("questions_english").select("*").in_("qid", target_qids).execute()
    
    if res.data:
        for row in res.data:
            print(f"--- {row['qid']} ---")
            print(f"  QuestionText: '{row.get('questiontext')}'")
            print(f"  Topic: {row['topic']} / Subtopic: {row['subtopic']}")
            print(f"  Raw Keys: {list(row.keys())}")
    else:
        print("❌ QIDs not found in DB.")

if __name__ == "__main__":
    research_specific()
