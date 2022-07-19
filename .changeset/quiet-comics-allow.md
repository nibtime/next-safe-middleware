---
"@next-safe/middleware": patch
---

fix(strictDynamic): exclude Safari from Hash-based Strict CSP

- the problem is probably that Safari isn't truly CSP-3 compliant yet, like Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1409200. `strict-dynamic` seems to mess up SRI validation there.
