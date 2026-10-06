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

## Rules

- The AI reserve/settle functions only accept calls that carry `MISE_SERVER_SECRET`; the database keeps just its SHA-256 hash in `ai_settings.server_secret_sha256`. When rotating the secret, regenerate it and update that hash to the new value's SHA-256 (and keep the migration files in sync), otherwise every generation fails with `ai_forbidden`.
