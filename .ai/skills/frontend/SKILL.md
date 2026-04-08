# FRONTEND RULES

## 1. DO NOT BREAK UI
- Keep current layout
- Keep UX flow
- Only enhance, not redesign

## 2. COMPONENT STRUCTURE

/components/{feature}/
- index.tsx
- hooks.ts
- types.ts

## 3. REUSE FIRST
- Check existing components before creating new

## 4. STATE MANAGEMENT
- Avoid unnecessary states
- Keep state clean

## 5. DATA FETCHING
- Use hooks (SWR/React Query if available)
- Handle:
  - loading
  - error
  - empty

## 6. FORM
- Validate input
- Show clear errors

## 7. UI CLEAN CODE
- Clear naming
- No duplicated UI

- Never access database directly from UI