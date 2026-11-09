# Windows notification bridge — local preview

This uses Windows UserNotificationListener with explicit Windows consent. It reads Windows toast notifications, including Phone Link alerts that Windows exposes through that API. It does not connect directly to an iPhone, control calls, dismiss Windows notifications, or access calendars.

The unsigned preview MSIX uses Microsoft’s designated unsigned publisher OID. Windows 11 may require administrator approval to install this executable package. No certificate is trusted and no Developer Mode or system-wide security setting is changed. Do not distribute this unsigned preview widely; a production release requires a signed identity package and an appropriate install/update flow.

`Bridge.cs` builds with the .NET Framework compiler and Windows SDK metadata using `scripts/build-notification-bridge.ps1`. `scripts/package-notification-bridge.ps1` creates the local MSIX. Both scripts use the installed Windows SDK. `launch.ps1` activates the registered bridge with a random per-session pipe name; installation is only attempted after an explicit Enable action.

Notification content travels over a local named pipe into DriveDeck, remains in memory for at most 50 recent notifications, and is never added to phone-dashboard HTTP snapshots. Existing notifications are baselined rather than replayed. Revoked permission stops capture. Disabling the feature clears the history and closes the pipe; the bridge then exits. App filters and message-preview redaction are applied before renderer delivery.
