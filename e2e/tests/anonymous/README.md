# tests/anonymous

Tests that start **logged out** (project `anonymous`, no saved login): login page, wrong password, redirects for private pages, public share page, sign-up closed/open, forgot-password page.

These tests log in and out by themselves when they need to. Scenario list: modules AUTH, SEC (anonymous parts), SHARE in `docs/TEST-SCENARIOS.md`.
