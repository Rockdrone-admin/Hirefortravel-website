09:17:40.967 Running build in Washington, D.C., USA (East) – iad1
09:17:40.968 Build machine configuration: 2 cores, 8 GB
09:17:41.076 Retrieving list of deployment files...
09:17:41.078 Previous build caches not available.
09:17:41.562 Downloading 70 deployment files...
09:17:42.422 Running "vercel build"
09:17:43.280 Vercel CLI 53.3.2
09:17:43.385 > Detected Turbo. Adjusting default settings...
09:17:43.533 Running "install" command: `npm install --prefix=../..`...
09:17:52.496 
09:17:52.497 added 116 packages, and audited 120 packages in 9s
09:17:52.497 
09:17:52.498 26 packages are looking for funding
09:17:52.498   run `npm fund` for details
09:17:52.569 
09:17:52.570 2 vulnerabilities (1 moderate, 1 high)
09:17:52.570 
09:17:52.570 To address all issues, run:
09:17:52.571   npm audit fix --force
09:17:52.571 
09:17:52.571 Run `npm audit` for details.
09:17:52.627 Detected Next.js version: 14.2.35
09:17:52.629 Running "cd ../.. && turbo run build --filter={apps/api}..."
09:17:52.859 
09:17:52.862    • Packages in scope: api
09:17:52.862    • Running build in 1 packages
09:17:52.862    • Remote caching enabled
09:17:52.863 
09:17:52.978 api:build: cache miss, executing 84c4379e89ac676c
09:17:53.150 api:build: 
09:17:53.150 api:build: > api@1.0.0 build
09:17:53.150 api:build: > next build
09:17:53.150 api:build: 
09:17:53.650 api:build: Attention: Next.js now collects completely anonymous telemetry regarding usage.
09:17:53.650 api:build: This information is used to shape Next.js' roadmap and prioritize features.
09:17:53.650 api:build: You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
09:17:53.650 api:build: https://nextjs.org/telemetry
09:17:53.651 api:build: 
09:17:53.696 api:build:   ▲ Next.js 14.2.35
09:17:53.697 api:build: 
09:17:53.711 api:build:    Creating an optimized production build ...
09:18:00.198 api:build:  ✓ Compiled successfully
09:18:00.200 api:build:    Linting and checking validity of types ...
09:18:00.300 api:build:    Collecting page data ...
09:18:00.600 api:build: Error: supabaseUrl is required.
09:18:00.601 api:build:     at /vercel/path0/apps/api/.next/server/chunks/847.js:37:51271
09:18:00.601 api:build:     at new rW (/vercel/path0/apps/api/.next/server/chunks/847.js:37:51522)
09:18:00.601 api:build:     at rK (/vercel/path0/apps/api/.next/server/chunks/847.js:37:55393)
09:18:00.602 api:build:     at 7958 (/vercel/path0/apps/api/.next/server/app/api/analytics/route.js:1:2622)
09:18:00.602 api:build:     at t (/vercel/path0/apps/api/.next/server/webpack-runtime.js:1:127)
09:18:00.603 api:build:     at 5851 (/vercel/path0/apps/api/.next/server/app/api/analytics/route.js:1:507)
09:18:00.604 api:build:     at t (/vercel/path0/apps/api/.next/server/webpack-runtime.js:1:127)
09:18:00.604 api:build:     at t (/vercel/path0/apps/api/.next/server/app/api/analytics/route.js:1:2724)
09:18:00.604 api:build:     at /vercel/path0/apps/api/.next/server/app/api/analytics/route.js:1:2755
09:18:00.604 api:build:     at t.X (/vercel/path0/apps/api/.next/server/webpack-runtime.js:1:759)
09:18:00.609 api:build: 
09:18:00.610 api:build: > Build error occurred
09:18:00.612 api:build: Error: Failed to collect page data for /api/analytics
09:18:00.613 api:build:     at /vercel/path0/node_modules/next/dist/build/utils.js:1269:15
09:18:00.613 api:build:     at process.processTicksAndRejections (node:internal/process/task_queues:104:5) {
09:18:00.613 api:build:   type: 'Error'
09:18:00.614 api:build: }
09:18:00.628 api:build: npm error Lifecycle script `build` failed with error:
09:18:00.628 api:build: npm error code 1
09:18:00.629 api:build: npm error path /vercel/path0/apps/api
09:18:00.629 api:build: npm error workspace api@1.0.0
09:18:00.629 api:build: npm error location /vercel/path0/apps/api
09:18:00.630 api:build: npm error command failed
09:18:00.630 api:build: npm error command sh -c next build
09:18:00.636  ERROR  api#build: command (/vercel/path0/apps/api) /node24/bin/npm run build exited (1)
09:18:00.636 
09:18:00.637   Tasks:    0 successful, 1 total
09:18:00.637  Cached:    0 cached, 1 total
09:18:00.637    Time:    7.908s 
09:18:00.637 Summary:    /vercel/path0/.turbo/runs/3DYuN1L47pqQOUFiig0lvAv6tmL.json
09:18:00.637  Failed:    api#build
09:18:00.638 
09:18:00.642  ERROR  run failed: command  exited (1)
09:18:00.659 Error: Command "cd ../.. && turbo run build --filter={apps/api}..." exited with 1