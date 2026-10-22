<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Tenant demo selections are transient; initial tenant resolution uses only an explicit URL selection or the hostname, never a saved browser override, so demos cannot replace the company's default site.
- Static delivery (CPanel): the deliverable is the `site/` folder (client build + .htaccess SPA fallback), built with `VITE_APP_BASE=/academy` (vite base + router basepath, default "/"). All DB/public image URLs render through `withBase()` (src/lib/urls.ts) and the `/__l5e/` covers are vendored under `public/__l5e/`, so the bundle is self-sufficient outside Lovable hosting. Never reference absolute asset URLs directly in components.

