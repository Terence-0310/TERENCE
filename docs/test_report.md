# TERENCE Backend Test Report

This is an auto-generated report showcasing the integrity of the TERENCE project Authentication and APIs.

## Test Summary

- **Total Test Suites**: 18
- **Total Tests Run**: 246
- **Status**: 100% Passed
- **Framework**: Vitest

## Covered Modules

1. **Authentication (luồng Auth)**
    - Verifies passwords and password hashing logic (e.g. `auth.test.ts`).
    - Validates sessions creation, verification, mapping (e.g. `session.test.ts`).
    - Validates Authentication API endpoints mapping correct response statuses such as `401 Unauthorized` for incorrect credentials, and returning user profiles seamlessly via `GET /api/auth/login`.

2. **Movie Data Mapping & Endpoint logic (luồng Movie APIs)**
    - Verifies endpoint handling for movies e.g. error propagation (`500 when database service fails`, `movie-api.test.ts`).
    - Integration coverage for database edge cases.

3. **Rate Limiting & Middlewares (luồng Security)**
    - Validates IP request limiting to deter spam `rate-limit.test.ts`.
    - Throws `429 Too Many Requests` context errors properly.

4. **Utils / Formatting**
    - `time-format.test.ts` validates time conversions and representation formats.

## Key Outcomes
All systems are nominal with the newly integrated PostgreSQL mappings checking out and the removed legacy structures showing no regressions.
