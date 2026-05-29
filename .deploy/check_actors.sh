#!/bin/bash
echo "=== Action stars in DB ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT name FROM \"Person\"
WHERE name ILIKE '%jackie%'
   OR name ILIKE '%donnie%'
   OR name ILIKE '%jet li%'
   OR name ILIKE '%wu jing%'
   OR name ILIKE '%chan kong%'
   OR name ILIKE '%thành long%'
   OR name ILIKE '%mỹ tâm%'
   OR name ILIKE '%tran thanh%'
   OR name ILIKE '%trấn thành%'
ORDER BY name;"

echo ""
echo "=== Count Persons by writing system ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT
  COUNT(*) FILTER (WHERE name ~ '^[A-Za-z]') AS latin,
  COUNT(*) FILTER (WHERE name ~ '[À-ỹ]') AS vietnamese,
  COUNT(*) FILTER (WHERE name ~ '[一-龥]') AS chinese,
  COUNT(*) FILTER (WHERE name ~ '[가-힣]') AS korean,
  COUNT(*) FILTER (WHERE name ~ '[ぁ-ゔァ-ヴー々〆〤]') AS japanese
FROM \"Person\";"
