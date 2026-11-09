# DriveDeck product scope

DriveDeck builds are BeamNG-only. The user explicitly asked to keep Forza support out of this and all future builds. Do not restore or package the archived experiment under `.runtime/forza-experiment-archived` unless the user changes this requirement.

Keep secret deck unlocks and effects out of public release notes. Every future public release must include the download guidance in RELEASE-DOWNLOADS.md.

Before replacing an installed companion ZIP, verify BeamNG is fully closed using the running-game check in src/lib/companion-state.cjs. BeamNG can retain a mounted archive's old entry lengths, so overwriting its ZIP while running can truncate Lua reads and disable vehicle loading. Do not bypass this check for manual companion updates.
