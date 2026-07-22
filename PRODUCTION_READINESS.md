# Trade Pro production readiness

## Current safety state

- Practice and sandbox execution are available.
- Live trading is hard-disabled in `platform_controls`.
- User funds are never stored by Trade Pro.
- Alpaca OAuth cannot start without approved credentials.
- Options, futures, duplicate orders, expired mandates, paused mandates, and orders above user limits are blocked.

## Completed application controls

- Owner-only login, eight-hour sessions, authenticator 2FA, recovery codes, and audit logs
- AI permission modes, per-order limits, daily limits, allowed markets, mandate pause, and expiration enforcement
- Global emergency stop and invitation-only paper beta
- Safety event and user-notification records
- Idempotency keys and duplicate-order detection
- Broker reconciliation records and owner-triggered reconciliation
- Strategy catalog with risk/source/disclosure-delay fields
- Security headers, production secret validation, encrypted sensitive fields, and redacted authentication logs
- Health endpoint and automated critical-flow tests

## External gates — cannot be completed by code alone

1. Register Trade Pro with Alpaca and obtain written approval for commercial OAuth access.
2. Store credentials only in the production secret manager; never commit them.
3. Verify Alpaca's approved callback, scopes, branding, disclosures, and paper-account behavior.
4. Complete securities counsel review, privacy policy, terms, customer disclosures, adviser/broker analysis, and applicable registrations.
5. Approve an invitation-only paper beta and define support/incident owners.
6. Run reconciliation and failure drills with paper accounts.
7. Obtain written owner approval before changing `liveTradingEnabled` behavior in code. The current admin API cannot enable it.

## Launch sequence

1. Paper OAuth connection
2. Balance, position, order, partial-fill, cancel, and disconnect tests
3. Webhook signature verification and scheduled reconciliation
4. Paper beta with emergency-stop drill
5. Legal/compliance sign-off
6. Limited live beta with low limits and confirm-each-trade mode
7. Monitoring review before expanding users, strategies, assets, or brokers

## Operational checks

- Review owner audit logs and safety events daily during beta.
- Reconcile broker orders at startup, on webhook receipt, and at least every five minutes.
- Alert on missing orders, status mismatches, repeated rejections, disconnects, and unusual order volume.
- Rotate JWT, encryption, broker, email, and monitoring secrets under a documented incident procedure.
- Back up the database and perform a restore test before live launch.
- Resolve production dependency audit findings based on exploitability; do not run breaking automatic upgrades without regression tests.
