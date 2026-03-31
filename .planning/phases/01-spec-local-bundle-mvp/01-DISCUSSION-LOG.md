# Phase 1: Spec + local bundle MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-31  
**Phase:** 01-Spec + local bundle MVP  
**Areas discussed:** 스키마 버전, lineage, pack/unpack 동등성, apply 대상·충돌, 시크릿 lint·스캔 아키텍처, CLI 명령(create/pack 분리·의존성), install/list(Phase 1 로컬 vs 계정/URL 확장)

---

## Bundle schema versioning

| Option | Description | Selected |
|--------|-------------|----------|
| Strict exact match | schema_version must match exactly | |
| Major strict, minor/patch warn | recommended default | ✓ |
| Best-effort parse | widest compatibility | |

**User's choice:** major 불일치 실패, minor/patch 불일치 경고 후 진행. 시작 버전 `1.0.0`.  
**Notes:** 사용자가 “버전이 무엇인지” 혼동 → `bundle.json`의 스키마 버전임을 설명 후 확정.

---

## Lineage fields (Phase 1 manifest/docs)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | origin id only | |
| Balanced | + snapshot + imported_at | |
| Extended | + root/parent/author fields | ✓ |

**User's choice:** 확장형(전 필드 명시).

---

## Pack/unpack snapshot equality

| Option | Description | Selected |
|--------|-------------|----------|
| Byte-identical archive | strict bytes | |
| Normalized hash | ignore non-content metadata | ✓ |
| Rule-based subset compare | partial paths | |

**User's choice:** 정규화 해시 동등.

**Normalization details**

| Option | Description | Selected |
|--------|-------------|----------|
| Content only | ignore paths | |
| Paths + content, drop archive/file meta | recommended | ✓ |
| Include permissions | stricter | |

**User's choice:** 경로+내용 비교, mtime/zip 시간/압축/OS 메타 무시.

---

## `apply` — collisions and target root

| Collision policy | Description | Selected |
|------------------|-------------|----------|
| Always overwrite | destructive default | |
| Fail unless `--force` | safe default | ✓ |
| Auto backup | extra complexity | |

**Target root**

| Option | Description | Selected |
|--------|-------------|----------|
| Project workspace | repo-relative | |
| User global `~/.claude` | matches “user-attached bundle” | ✓ |

**Notes:** 사용자는 프로젝트가 아니라 사용자 전역 클로드 설정에 번들이 붙어야 한다고 명시.

---

## Secret / risk lint

| Scan architecture | Description | Selected |
|--------------------|-------------|----------|
| LLM-assisted scan | risky exfiltration | |
| Local deterministic rules only | no model reads content | ✓ |

**Severity vs visibility**

| Policy | Description | Selected |
|--------|-------------|----------|
| Always block | regardless of visibility | |
| Public block, private warn only | aligns with product safety + dev iteration | ✓ |

**Scan scope:** manifest-only vs full archive + risky filenames → **CONTEXT에서 아카이브 전체 + 고위험 파일명 규칙**으로 확정.

**User concern:** “AI에게 스캔시키면 유출” → 로컬 전용으로 고정. 추가로 **로컬 Claude Code에도 원문을 읽히지 않도록 스크립트만** 요구.

---

## CLI surface — `create` vs `pack`

| Approach | Description | Selected |
|----------|-------------|----------|
| Only pack | no guided creation | |
| Separate commands with enforcement | pack requires manifest; create is wizard | ✓ |
| Single mega-command | less modular | |

**User request additions**

- `install` 필요.
- `list`는 (장기적으로) 계정 연결 번들 + 설치 상태. Phase 1에서는 로컬 해석으로 캡처하고 계정/URL은 defer.

---

## Claude's Discretion

- 레지스트리 파일 위치/형식, 규칙 세트 세부, 해시 정규화 알고리즘 세부.

## Deferred Ideas

- 계정 기반 `list`, 계정에 있으면 URL 없는 `install`, 타인 번들 URL `install` → Phase 2+.
