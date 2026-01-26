# Contributing to ScaleConfig

Thanks for your interest in contributing! This project welcomes issues, feature requests, and pull requests.

## Quick Start
1. Fork the repo and clone your fork.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Development Workflow
- Create a feature branch: `git checkout -b feature/your-feature`
- Keep changes focused and small when possible
- Add or update tests for behavior changes
- Run checks before opening a PR:
  ```bash
  npm run lint
  npm test
  npm run build
  ```

## Code Style
- TypeScript + React (Vite)
- Prefer clear, explicit naming
- Avoid changing TMS parsing behavior without tests

## Pull Requests
Please include:
- A clear description of the change
- Screenshots for UI changes, if applicable
- Notes about any new dependencies

## Reporting Issues
When filing a bug report, include:
- Steps to reproduce
- Expected vs. actual behavior
- Sample .TMS file if possible (sanitized)

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
