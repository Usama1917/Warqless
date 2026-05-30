---
name: i18n TranslationKeys type pattern
description: How to type i18n translation files so Arabic translations satisfy the type without literal-string failures
---

The `en.ts` file exports with `as const`, making all string values literal types. Arabic translations cannot satisfy `typeof en` directly.

**Fix:** Export a `DeepString<T>` mapped type from `en.ts`:

```ts
type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> };
export type TranslationKeys = DeepString<typeof en>;
```

**Why:** `as const` creates literal types like `"Home"`, `"Back"` etc. Any Arabic translation like `"الرئيسية"` fails the literal check. `DeepString` maps all leaf strings to `string` while preserving the key structure.

**How to apply:** Use this pattern in any i18n system that uses `as const` for English source-of-truth but needs type safety across multiple language files.
