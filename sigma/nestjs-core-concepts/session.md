# Session: NestJS Core Concepts
## Learner Profile
- Level: intermediate (diagnosing)
- Language: zh
- Started: 2026-07-14

## Concept Map
| # | Concept | Prerequisites | Status | Score | Last Reviewed | Review Interval |
|---|---------|---------------|--------|-------|---------------|-----------------|
| 1 | Decorators & Metadata | - | mastered | - | - | - |
| 2 | Dependency Injection | 1 | mastered | - | - | - |
| 3 | Constructor vs Property Injection | 2 | mastered | 85% | 2026-07-14 | 1d |
| 4 | Module System | 2 | mastered | - | - | - |
| 5 | TypeORM Entities & Relations | 2 | mastered | - | - | - |
| 6 | Repository Pattern | 5 | mastered | - | - | - |
| 7 | DTO & ValidationPipe | 2 | mastered | - | - | - |
| 8 | JWT Authentication | 2 | mastered | - | - | - |
| 9 | Guards & Reflector | 8 | mastered | - | - | - |
| 10 | Custom Decorators | 9 | mastered | - | - | - |
| 11 | RBAC Permission Model | 9, 10 | mastered | - | - | - |
| 12 | Interceptors | 2 | mastered | - | - | - |
| 13 | Exception Filters | 2 | mastered | - | - | - |
| 14 | Global Type Declaration | 2 | in-progress | 70% | 2026-07-14 | - |
| 15 | Redis Integration | 2 | mastered | - | - | - |
| 16 | Config Management | 2 | mastered | - | - | - |
| 17 | Unit Testing | 2 | not-started | - | - | - |
| 18 | Transactions | 6 | not-started | - | - | - |
| 19 | Swagger/OpenAPI | 2 | not-started | - | - | - |
| 20 | Docker Deployment | - | not-started | - | - | - |

## Misconceptions
| # | Concept | Misconception | Root Cause | Status | Counter-Example Used |
|---|---------|---------------|------------|--------|---------------------|
| 1 | DI Style | Mixing constructor and property injection without convention | Unclear on when to use which | resolved | Q1: user correctly identified injection timing difference and circular dep scenario |
| 2 | Type Declaration | "Inline declaration in guard file is correct" — believes `login.guard.ts` is the right place for Request.user type | Unclear on declaration merging scope and file organization best practice | resolved | Counter-example: without global declaration, files not importing login.guard lose type inference for request.user |
| 3 | JWT Payload Consistency | Changed type field name from `userId` to `id` without updating `jwtService.sign()` payload | Implementation oversight during refactor | active | - |

## Session Log
- [2026-07-14] Diagnosing level based on code review
- [2026-07-14] Q1 (Constructor vs Property Injection): User answered correctly — identified injection timing diff and circular dep use case. Marked mastered (85%).
- [2026-07-14] Q2 (Global Type Declaration): User correctly identified type conflict cause. Chose LoginUserVo as unified type (reasonable). **Misconception identified**: Believes inline declaration in guard file is correct practice. Needs counter-example to discover module visibility issue.
- [2026-07-14] Q2 follow-up: User recognized global declaration is better for maintainability. Misconception resolved. **New gap**: Implementation introduced field name mismatch — JWT payload uses `userId` but new type uses `id`.
