.PHONY: help install dev data validate test typecheck lint build screenshots clean release-check

help: ## Show this help
	@echo "World Infrastructure Data Hub — make targets"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install --no-audit --no-fund

dev: ## Run the Vite dev server (http://localhost:5173)
	npm run dev

data: ## Fetch all upstream feeds and regenerate countries.json
	npm run generate-data

validate: ## Validate the generated dataset against schemas/countries.schema.json
	npm run validate

test: ## Run the Vitest unit test suite once
	npm test -- --run

typecheck: ## Run the TypeScript project-references build
	npx tsc -b --force

lint: ## Run ESLint
	npm run lint

build: ## Full production build (regenerate data + typecheck + bundle)
	npm run build

screenshots: ## Refresh the README screenshots via Playwright
	node scripts/takeScreenshots.mjs

clean: ## Remove build artifacts (leaves node_modules alone)
	rm -rf dist

release-check: test typecheck lint validate build ## Run every quality gate locally before cutting a release
	@echo ""
	@echo "✅ all release gates passed"
