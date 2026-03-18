---
description: Sync UI changes (Tables, PS) to repository before any push
---

Before any `git commit` or `git push`, follow these steps:

// turbo
1. Sync Database Changes
   `npm run db:sync`

2. Check to see if any files were updated (e.g. `Disrtrict_PS.csv`, `prisma/seed-production.js`)
   `git status`

3. If files were changed, add them to the staging area
   `git add .`

4. Proceed with commit and push
   `git commit -m "Your commit message"`
   `git push`
