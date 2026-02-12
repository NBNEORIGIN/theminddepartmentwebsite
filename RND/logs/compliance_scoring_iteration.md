# Compliance Intelligence — Scoring Iteration Log

## Date: 2026-02-12

## Scoring Model Design

### Weighting Assumptions

| Item Type | Weight | Rationale |
|-----------|--------|-----------|
| LEGAL | 2× | Legal requirements carry double weight because non-compliance has regulatory consequences (fines, enforcement notices, prosecution) |
| BEST_PRACTICE | 1× | Best practice items improve safety culture but are not legally mandated |

### Status Scoring Factors

| Status | Factor | Rationale |
|--------|--------|-----------|
| COMPLIANT | 1.0 (100%) | Full weight — item is up to date |
| DUE_SOON | 0.5 (50%) | Partial credit — item is approaching deadline but not yet overdue |
| OVERDUE | 0.0 (0%) | Zero credit — item has passed its deadline |

### Score Formula

```
Total Possible Weight = sum(weight for each item)
Achieved Weight = sum(weight × status_factor for each item)
Peace of Mind Score = round((Achieved / Total) × 100)
```

### Threshold Decisions

| Score Range | Colour | Interpretation |
|-------------|--------|----------------|
| 90–100 | Green | "Your compliance is in strong shape." |
| 70–89 | Green/Amber | "A few items need attention soon." |
| 60–79 | Amber | "A few items need attention soon." |
| <60 | Red | "There are overdue compliance items." |

**Dashboard colour coding uses 80/60 thresholds** (green ≥80, amber ≥60, red <60) to provide earlier visual warning than the text messaging.

### Tone Decision

Messaging is deliberately:
- **Calm** — not alarming
- **Supportive** — not punitive
- **Factual** — not vague

This reflects the Mind Department's wellness-first ethos. A compliance dashboard should not create anxiety.

---

## Alternative Scoring Models Considered

### 1. Linear Additive (Chosen)
- Simple, transparent, auditable
- Easy to explain to non-technical users
- Predictable behaviour

### 2. Exponential Penalty for Overdue
- Overdue items would reduce score exponentially based on days overdue
- **Rejected**: Too complex for v1, creates anxiety, hard to explain
- **Future consideration**: Could add "severity multiplier" based on days overdue

### 3. Category-Weighted Scoring
- Different categories (Fire Safety, Chemical Handling) have different weights
- **Rejected for v1**: Adds configuration complexity
- **Future consideration**: Allow admin to set category weights

### 4. Risk-Based Scoring (Severity × Likelihood)
- Traditional risk matrix approach
- **Rejected**: Requires additional data fields, more complex UX
- **Future consideration**: Could integrate with HazardFinding severity data

---

## Limitations

1. **Binary compliance status** — Items are COMPLIANT, DUE_SOON, or OVERDUE. No granularity for "partially compliant" or "in progress"
2. **No time-decay** — An item overdue by 1 day scores the same as one overdue by 6 months
3. **Equal category weighting** — All categories contribute equally (within LEGAL/BEST_PRACTICE types)
4. **Single score** — One number for entire organisation; no per-location or per-department breakdown
5. **Manual status updates** — Items don't auto-transition to OVERDUE based on due_date (would need scheduled task)

---

## Future AI Enhancement Possibilities

1. **Auto-status transition** — Scheduled task to check due_dates and auto-mark items as DUE_SOON (within 30 days) or OVERDUE (past due)
2. **Predictive scoring** — ML model to predict future score based on historical patterns
3. **Smart recommendations** — AI-generated suggestions for which items to prioritise based on regulatory risk
4. **Document analysis** — NLP to extract compliance requirements from uploaded RAMS documents
5. **Anomaly detection** — Flag unusual patterns (e.g., items repeatedly going overdue)
6. **Natural language reports** — LLM-generated compliance summary reports for board meetings

---

## Architecture Decisions

- **Single-row PeaceOfMindScore** — Cached score with pk=1, recalculated on every ComplianceItem change via Django signals
- **ScoreAuditLog** — Every recalculation logged with before/after scores, trigger type, and item counts
- **Signal-based recalculation** — post_save and post_delete on ComplianceItem trigger immediate recalculation
- **Management command** — `recalculate_compliance_score` for manual/scheduled recalculation
- **API-first** — All dashboard data served via DRF endpoints, consumed by Next.js frontend
- **Admin integration** — Full Jazzmin admin for all models with inline editing and bulk actions

---

## Recalculation Triggers

1. ComplianceItem saved (status change, new item, marked complete)
2. ComplianceItem deleted
3. Manual via management command: `python manage.py recalculate_compliance_score`
4. Scheduled (daily): `python manage.py recalculate_compliance_score --trigger=scheduled`
5. Manual via API: `POST /api/compliance/recalculate/`

---

## Test Scenarios Verified

| Case | Setup | Expected Score | Rationale |
|------|-------|---------------|-----------|
| All compliant | 5 LEGAL + 5 BP, all COMPLIANT | 100% | Full weight achieved |
| One LEGAL overdue | 4 LEGAL compliant + 1 LEGAL overdue + 5 BP compliant | 87% | Lost 2 of 15 total weight |
| One BP overdue | 5 LEGAL compliant + 4 BP compliant + 1 BP overdue | 93% | Lost 1 of 15 total weight |
| All due soon | All items DUE_SOON | 50% | Every item at 50% factor |
| Mixed | 3 LEGAL compliant, 2 LEGAL overdue, 3 BP compliant, 2 BP due soon | 60% | (6+0+3+1)/15 = 67% |
