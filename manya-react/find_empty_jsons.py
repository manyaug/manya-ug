import os
import json

base = r'd:\\manya_app\\manya-react\\public\\content\\math'
empty_files = []

for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.json') and f != 'curriculum-master.json':
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read().strip()
                if not content:
                    empty_files.append(path)
                    continue
                data = json.loads(content)
                if not data:
                    empty_files.append(path)
                    continue
                if 'slides' in data and not data['slides']:
                    empty_files.append(path)
                    continue
                if 'questions' in data and not data['questions']:
                    empty_files.append(path)
                    continue
                
            except json.JSONDecodeError:
                empty_files.append(path)

print('Found empty files:')
for f in empty_files:
    print(f)
