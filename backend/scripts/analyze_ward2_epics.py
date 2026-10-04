import re
import json
import pymongo

client = pymongo.MongoClient('mongodb://187.127.173.42:27017/')
db = client['political_crm']
members_col = db['members']

with open('scratch_ward2_text.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

# Pattern to find all EPICs in scratch_ward2_text
epics = re.findall(r'(?:[A-Z]{3}\d{7})|(?:RJ/\d+/\d+/\d+)', full_text)
unique_epics = list(dict.fromkeys(epics))
print(f"Total EPICs found in Ward 2 text: {len(epics)} (Unique: {len(unique_epics)})")

# Let's count how many of these EPICs exist in the database
matched_count = 0
not_found_epics = []

for epic in unique_epics:
    m = members_col.find_one({'voterId': epic})
    if m:
        matched_count += 1
    else:
        not_found_epics.append(epic)

print(f"Existing in DB by EPIC: {matched_count} / {len(unique_epics)} ({matched_count/len(unique_epics)*100:.1f}%)")
print(f"Not found by EPIC directly: {len(not_found_epics)}")
if not_found_epics:
    print("Sample not found:", not_found_epics[:10])
