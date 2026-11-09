$ErrorActionPreference = 'Stop'
# Authenticated READ-ONLY checks. Never include secret values/digests in evidence.
$migrations = npx supabase migration list --remote | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Migration inventory failed' }
$dryRun = npx supabase db push --dry-run --remote | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Migration dry run failed' }
$functions = npx supabase functions list --remote | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Function inventory failed' }
$database = npx supabase db query --remote --read-only --file scripts/release-preflight.sql | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Database read-only inventory failed' }
$secrets = npx supabase secrets list --remote --output-format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Secret-name inventory failed' }
$report = [ordered]@{
 checkedAt = [DateTime]::UtcNow.ToString('o')
 projectRef = 'anvswymarultvsbszjte'
 migrations = $migrations.migrations
 pendingDryRun = $dryRun.migrations
 deployedFunctions = @($functions.functions | ForEach-Object { $_.slug })
 database = $database.rows[0].release_inventory
 functionSecretNames = @($secrets.secrets | ForEach-Object { $_.name })
 boundaryMigrationSha256 = (Get-FileHash -LiteralPath supabase/migrations/20261109000000_analytics_boundary.sql -Algorithm SHA256).Hash.ToLowerInvariant()
 productionWrites = 0
}
$report | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 reports/release-supabase-preflight.json
Write-Output 'Read-only release inventory saved; no secret values or digests retained.'
