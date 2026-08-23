## Summary

<!-- What changed? -->

## Project Role

Select all affected roles:

- [ ] Software project — code, CI/CD, security or quality
- [ ] Digital archive — sets, broadcasts, events, metadata or media records
- [ ] OSINT knowledge graph — sources, evidence, assertions, confidence or timelines

## Security Impact

- [ ] No security impact
- [ ] Authentication / authorization
- [ ] Secrets / credentials
- [ ] GitHub Actions / CI permissions
- [ ] Dependencies / supply chain
- [ ] Public metadata / provenance integrity

Details:

## Agent / MCP / Termux Boundary

- [ ] N/A — this PR does not change an Agent, MCP or Termux tool path
- [ ] `InternalToolRequest` carries `effect` and `operationId`
- [ ] `assertToolRequestIsSafe()` runs before every tool dispatch
- [ ] Tool and effect allowlists remain least-privilege and fail closed
- [ ] Denied requests are tested to prove that transport is never reached
- [ ] Retry and reconnect behavior is covered by tests
- [ ] Mutating operations are not replayed automatically
- [ ] Filesystem, shell, network and secret scopes are documented for Termux changes

Details:

## Provenance Impact

- [ ] No provenance impact
- [ ] New claim added
- [ ] Existing claim changed
- [ ] Claim confidence changed
- [ ] Claim status changed
- [ ] Source added or removed
- [ ] Conflict documented

Details:

## Evidence

List sources, archive paths or screenshots used by this PR.

## Validation

- [ ] `npm test`
- [ ] `./scripts/check-mcp-boundary.sh`
- [ ] `npm audit --audit-level=high`
- [ ] `python3 -m json.tool website/provenance.json`
- [ ] `ruby -e "require 'yaml'; YAML.load_file('archive/schema.yml')"`
- [ ] Manual review

## Rollback Plan

<!-- How can this be reverted safely? -->

## Residual Risk

<!-- What remains uncertain after this PR? -->
