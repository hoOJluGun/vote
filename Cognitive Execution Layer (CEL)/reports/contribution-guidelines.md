# Pull Request Templates and Contribution Guidelines

## Branch Naming Convention

```
feature/<area>/<short-description>
fix/<area>/<issue-number>-<description>
chore/<area>/<task-description>
refactor/<area>/<component-name>
```

**Examples:**
- `feature/security/vault-integration`
- `fix/server/response-time-optimization`
- `chore/docs/api-documentation-update`
- `refactor/server/modularize-routes`

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `chore`: Maintenance tasks
- `test`: Test-related changes
- `docs`: Documentation updates
- `style`: Code style changes
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```
feat(security): implement VaultSecretsManager with AppRole authentication

- Add Vault integration with circuit breaker pattern
- Implement LRU caching for secret values
- Add comprehensive unit tests (19/19 passing)

fix(server): resolve monolithic file startup delay

- Extract routes into separate modules
- Implement dependency injection container
- Reduce server startup time by 40%
```

## Pull Request Template

### Title Format
```
[<type>/<area>] <Short descriptive title>
```

**Examples:**
- `[feature/security] Implement Vault integration with AppRole auth`
- `[fix/server] Resolve response timeout issues`
- `[refactor/architecture] Modularize monolithic server`

### PR Description Template

```
## Problem
<!-- What problem does this PR solve? Why is it important? -->

## What Changed
<!-- Detailed description of changes made -->

## How to Test
<!-- Step-by-step testing instructions -->
1. 
2. 
3. 

## Checklist
- [ ] Tests pass locally (`npm test`)
- [ ] Swift tests pass (`swift test`)
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security review completed (if applicable)
- [ ] Performance impact assessed

## Screenshots/Logs
<!-- If applicable, add screenshots or logs showing the changes -->

## Migration Notes
<!-- Breaking changes and migration instructions -->

## Related Issues
<!-- Link to related GitHub issues -->
```

## Code Review Process

### Review Criteria

#### Must-Have Requirements
- ✅ All tests pass (both Node.js and Swift)
- ✅ Code follows established patterns and conventions
- ✅ Security considerations addressed
- ✅ Performance impact assessed
- ✅ Documentation updated

#### Nice-to-Have Improvements
- 📈 Test coverage increased
- 🚀 Performance optimizations
- 📝 Clear and helpful comments
- 🔧 Configurable and extensible design

### Review Timeline
- **Small changes** (<100 LOC): 24 hours
- **Medium changes** (100-500 LOC): 48 hours
- **Large changes** (>500 LOC): 72 hours

## Testing Requirements

### Minimum Test Coverage
- **New features**: 90%+ coverage
- **Bug fixes**: 80%+ coverage for affected areas
- **Refactored code**: Maintain existing coverage levels

### Test Categories Required
1. **Unit Tests**: Component-level testing
2. **Integration Tests**: Cross-component testing
3. **Security Tests**: Vulnerability assessments
4. **Performance Tests**: Load and stress testing

### Test Commands
```
# Node.js tests
npm test
npm run test:unit
npm run test:integration
npm run test:security

# Swift tests
cd xcode/CELClient
swift test
swift build
```

## Security Review Process

### When Required
- Changes to authentication/authorization
- Data encryption/decryption logic
- External API integrations
- Dependency updates
- Infrastructure changes

### Security Checklist
- [ ] No hardcoded secrets or credentials
- [ ] Proper input validation implemented
- [ ] Output encoding prevents injection attacks
- [ ] Rate limiting and abuse prevention
- [ ] Audit logging for security events
- [ ] Dependencies scanned for vulnerabilities

## Deployment Process

### Pre-Merge Requirements
1. ✅ All CI checks pass
2. ✅ Code review approved by 2+ reviewers
3. ✅ Security review completed (if applicable)
4. ✅ Performance testing completed
5. ✅ Documentation updated

### Merge Strategy
- Use **squash merge** for feature branches
- Use **merge commit** for release branches
- Update CHANGELOG.md with changes

### Post-Merge Actions
1. Monitor CI/CD pipeline status
2. Verify deployment to staging environment
3. Run smoke tests
4. Update project boards and documentation

## Emergency Procedures

### Hotfix Process
1. Create hotfix branch from main: `hotfix/<issue>`
2. Implement minimal fix addressing the specific issue
3. Fast-track review process (4-hour turnaround)
4. Deploy immediately after approval
5. Merge back to development branch

### Rollback Procedure
1. Identify problematic deployment
2. Execute rollback using deployment pipeline
3. Communicate rollback to stakeholders
4. Investigate root cause
5. Plan proper fix through normal process

## Communication Channels

### Primary
- **GitHub Issues**: Feature requests and bug reports
- **Pull Requests**: Code reviews and discussions
- **Project Board**: Sprint planning and progress tracking

### Secondary
- **Slack/Discord**: Real-time communication
- **Email**: Formal announcements and documentation
- **Wiki**: Knowledge base and best practices

## Quality Gates

### CI Pipeline Checks
- **Linting**: ESLint and SwiftLint
- **Testing**: Unit and integration tests
- **Security**: Dependency vulnerability scans
- **Build**: Compilation and packaging
- **Performance**: Basic benchmark checks

### Manual Quality Checks
- **Peer Review**: Code quality and best practices
- **Security Review**: Threat modeling and vulnerability assessment
- **Performance Review**: Load testing and optimization
- **User Experience**: Usability and accessibility

## Documentation Standards

### Required Documentation
1. **Code Comments**: Complex logic and non-obvious decisions
2. **API Documentation**: Public interfaces and endpoints
3. **Architecture Docs**: System design and component interactions
4. **User Guides**: How to use new features
5. **Migration Guides**: Breaking changes and upgrade paths

### Documentation Locations
- **Inline**: Code comments and JSDoc/SwiftDoc
- **README.md**: Project overview and getting started
- **docs/**: Detailed technical documentation
- **wiki/**: Process and best practice guides

## Recognition and Rewards

### Contribution Recognition
- **Code Contributors**: Listed in CONTRIBUTORS.md
- **Reviewers**: Acknowledged in commit messages
- **Security Findings**: Bug bounty program participation
- **Performance Improvements**: Team recognition and rewards

### Quality Incentives
- **Test Coverage Champions**: Monthly recognition
- **Code Quality Leaders**: Peer nomination program
- **Innovation Awards**: Quarterly innovation recognition
- **Mentorship Program**: Experienced contributors mentor newcomers

---
*Last Updated: February 20, 2026*
*Version: 1.0*