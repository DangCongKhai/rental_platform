# Stable private property bookmarks

Status: specified design, implementation unverified.

Decision: favourite_properties relates user_profiles to properties with UUID PK and unique pair. Save and remove actions set the desired state (safe to repeat); no toggle. Persistence independent of listing turnover/availability; visibility gate prevents hidden-content leaks.

Consequences: tests and issue acceptance must reference this behavior; record any approved change here and update affected PRDs/workflows/data/API/acceptance together.
