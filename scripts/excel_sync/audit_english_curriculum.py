import pandas as pd
import json

def audit_bank():
    path = "d:/manya_app/manya-react/public/content/main_bank/english-p7-question-bank.xlsx"
    df = pd.read_excel(path, "quests and grammar")
    
    inventory = {}
    subtopics = df['Sub-Topic'].dropna().unique()
    
    for st in subtopics:
        sub_df = df[df['Sub-Topic'] == st]
        vocab = sub_df['Vocabulary_Sample'].dropna().unique().tolist()
        questions = sub_df['Question_Text'].dropna().head(5).tolist()
        
        inventory[st] = {
            "vocab": vocab[:10],
            "sample_questions": questions
        }
    
    print(json.dumps(inventory, indent=2))

if __name__ == "__main__":
    audit_bank()
