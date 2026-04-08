# BACKEND RULES

## 1. LAYER STRUCTURE

Route/Controller
→ Service
→ Repository
→ Database

## 2. CONTROLLER RULE
- Only handle request/response
- No business logic

## 3. SERVICE RULE
- Handle business logic
- Reusable
- Clean and testable

## 4. REPOSITORY RULE
- Only database queries
- No business logic

## 5. VALIDATION
- Validate all inputs
- Do not trust client

## 6. RESPONSE FORMAT

Success:
{
  "success": true,
  "message": "...",
  "data": {}
}

Error:
{
  "success": false,
  "message": "..."
}

## 7. AUTHORIZATION
- Check role for admin routes
- Prevent unauthorized access

## 8. LOGGING
Must log:
- Create
- Update
- Delete
- Admin actions

## 9. ERROR HANDLING
- Use try/catch
- Do not expose sensitive info