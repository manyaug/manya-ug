import os
from supabase import create_client, Client

url = "https://pmgdfuhqgwysequaopts.supabase.co"
key = "sb_secret_YOUR_KEY_HERE"
supabase: Client = create_client(url, key)

def research_db():
    print("🔍 [Research] Investigating Supabase English Question Bank...")
    
    # 1. Look for questions with options: there, where, home, inside
    query = "optiona.eq.there,optionb.eq.there,optionc.eq.there,optiond.eq.there"
    res = supabase.table("questions_english").select("*").or_(query).execute()
    
    if res.data:
        print(f"✅ Found {len(res.data)} questions matching the suspicious options.")
        for row in res.data:
            q_text = row.get('questiontext')
            print(f"--- Question ID: {row['qid']} ---")
            print(f"  Topic: {row['topic']} / Subtopic: {row['subtopic']}")
            print(f"  Text: '{q_text}' (Length: {len(str(q_text)) if q_text else 0})")
            print(f"  Options: A:{row['optiona']}, B:{row['optionb']}, C:{row['optionc']}, D:{row['optiond']}")
            print(f"  Source Attachment: {row.get('filename')} / {row.get('source_sheet')}")
    else:
        print("❌ No matching questions found in Supabase.")

    # 2. General scan for NULL questiontext
    res_null = supabase.table("questions_english").select("qid,topic,subtopic").is_("questiontext", "null").execute()
    if res_null.data:
        print(f"\n⚠️ Found {len(res_null.data)} questions with NULL text!")
        topics = set([r['topic'] for r in res_null.data])
        print(f"  Affected Topics: {topics}")
        for row in res_null.data[:5]:
            print(f"  - {row['qid']} ({row['topic']})")
    else:
        print("\n✅ No NULL questiontext found in English bank.")

if __name__ == "__main__":
    research_db()
