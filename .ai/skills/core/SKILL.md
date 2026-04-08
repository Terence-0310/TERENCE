# CORE ENGINEERING RULES (MANDATORY)

## 1. ALWAYS SCAN BEFORE CODING
- Scan entire codebase before implementing anything
- Check:
  - Existing features
  - Existing APIs
  - Existing database schema
  - Existing components/hooks/services

## 2. DO NOT DUPLICATE
- If feature exists → EXTEND
- If not → CREATE NEW
- Never duplicate logic

## 3. DO NOT BREAK EXISTING SYSTEM
- Do not rewrite working code
- Do not break UI/UX
- Keep backward compatibility

## 4. CLEAN ARCHITECTURE
Must follow:

Frontend → API → Service → Repository → Database

## 5. FILE CHANGE RULE
Always state:
- What file is created
- What file is modified
- Why

## 6. README RULE
- Always append
- Never rewrite
- Never delete old content

## 7. THINK BEFORE CODE
Always:
- Analyze
- Plan
- Then implement

## 8. NO DIRTY CODE
Avoid:
- Duplicate code
- Hardcode
- Mixed responsibilities
- Spaghetti logic