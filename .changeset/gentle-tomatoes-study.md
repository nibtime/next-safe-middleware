---
"@next-safe/middleware": patch
---

use correct call order in `render()` of custom `Document` components. That should prevent things from breaking in ISR mode.
