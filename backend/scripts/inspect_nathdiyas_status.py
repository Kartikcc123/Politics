import pymongo
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

client = pymongo.MongoClient('mongodb://187.127.173.42:27017/')
db = client['political_crm']
members = db['members']

gp_regex = {'$regex': 'नाथडिया', '$options': 'i'}
total = members.count_documents({'gramPanchayat': gp_regex})
print(f"Total voters in DB for Nathdiyas: {total}")

pipeline = [
    {'$match': {'gramPanchayat': gp_regex}},
    {'$group': {
        '_id': '$wardNumber',
        'count': {'$sum': 1},
        'withPhoto': {'$sum': {'$cond': [{'$and': [{'$ne': ['$photo', None]}, {'$ne': ['$photo', '']}]}, 1, 0]}},
        'withWardCard': {'$sum': {'$cond': [{'$and': [{'$ne': ['$wardCardImage', None]}, {'$ne': ['$wardCardImage', '']}]}, 1, 0]}},
        'deleted': {'$sum': {'$cond': [{'$eq': ['$isDeleted', True]}, 1, 0]}},
        'maxSerial': {'$max': {'$toInt': '$wardVoterSerial'}}
    }},
    {'$sort': {'_id': 1}}
]
res = list(members.aggregate(pipeline))
for r in res:
    print(f"Ward {r['_id']}: Total={r['count']}, withPhoto={r['withPhoto']}, withCard={r['withWardCard']}, deleted={r['deleted']}, maxSerial={r.get('maxSerial')}")

# Also check sample voter in Ward 1
w1_sample = list(members.find({'gramPanchayat': gp_regex, 'wardNumber': '1'}).sort('wardVoterSerial', -1).limit(10))
print("\nTop 10 highest serials in Ward 1 DB:")
for v in w1_sample:
    print(f"  Serial: {v.get('wardVoterSerial')} | Name: {v.get('name')} | Photo: {bool(v.get('photo'))} | Card: {bool(v.get('wardCardImage'))} | EPIC: {v.get('voterId')}")
