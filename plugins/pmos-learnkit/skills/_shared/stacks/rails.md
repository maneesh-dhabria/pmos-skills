# rails Stack

Ruby on Rails applications. Detection signals: `Gemfile` + `bin/rails` + `config/application.rb`.

## Prereq Commands

```bash
ruby --version
bundle --version
bundle install --frozen
bin/rails db:prepare              # creates DB if missing, migrates, seeds (idempotent)
```

If `.ruby-version` exists, the planner asserts the running Ruby matches it. Asset prerequisites (Node + a JS package manager for `importmap`/`jsbundling`) follow the appropriate JS stack file when applicable.

## Lint/Test Commands

```bash
bundle exec rubocop
bundle exec rspec                 # if rspec is configured (presence of spec/ and .rspec)
bin/rails test                    # default minitest variant
bin/rails test:system             # system tests (Capybara + headless browser)
```

Variant precedence:

- `spec/` directory + `.rspec` file → rspec is canonical
- `test/` directory only → minitest is canonical
- Both present → choose per project convention (cite which is the gate in the plan)

## API Smoke Patterns

HTTP smoke (after `bin/rails s` is running):

```bash
curl -fsS http://localhost:3000/up                # Rails 7+ healthcheck
curl -fsS http://localhost:3000/api/v1/health | jq .
```

JSON assertion fallback when `jq` is absent:

```bash
curl -fsS http://localhost:3000/api/v1/health | python -m json.tool
```

GraphQL smoke (graphql-ruby):

```bash
curl -fsS -H 'content-type: application/json' \
  -d '{"query":"{ __typename }"}' http://localhost:3000/graphql | jq .
```

## Common Fixture Patterns

- factory_bot factories under `spec/factories/` (rspec) or `test/factories/` (minitest + factory_bot-rails).
- Rails fixtures (`test/fixtures/*.yml`) when factory_bot is not used.
- VCR cassettes under `spec/vcr_cassettes/` for HTTP-recording.
- Database cleanup via `DatabaseCleaner` (transactional) or Rails' built-in transactional fixtures.
