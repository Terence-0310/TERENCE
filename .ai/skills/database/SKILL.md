# DATABASE RULES

## 1. DO NOT BREAK SCHEMA
- Do not delete existing fields
- Do not rename randomly

## 2. ADDITIVE CHANGES ONLY
- Add fields
- Add tables
- Add relations

## 3. STANDARD FIELDS

id        String   @id @default(uuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

## 4. INDEXING

Add index for:
- slug
- title
- foreign keys

## 5. RELATION
- Use proper relation naming
- Avoid redundant fields

## 6. MIGRATION
- Safe migration only
- Do not lose data