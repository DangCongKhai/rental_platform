# Project glossary

| Term                | Meaning                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| Property            | Owner-managed physical container                                                 |
| Unit                | Independently rentable space                                                     |
| Listing             | Property-level public advertisement                                              |
| PENDING enquiry     | Offline discussion continues; no reservation                                     |
| ACCEPTED enquiry    | A tenancy proposal committed; not necessarily mutual agreement                   |
| Contract version    | One immutable submitted row in tenancy_contracts                                 |
| Confirmation        | Write-once party timestamp on the exact contract row/hash                        |
| Confirmed span      | Projection of consecutive mutually confirmed segments                            |
| Blocked span        | Confirmed span plus current proposed original/renewal hold                       |
| Operational status  | READY/MAINTENANCE/RETIRED; separate from period availability                     |
| Favourite           | Private persisted property bookmark                                              |
| Admin suspension    | Restriction owner cannot clear                                                   |
| Submission revision | Snapshot checked only for first review                                           |
| Publication         | Owner choice separate from moderation and availability                           |
| Product priority    | P0/P1/P2/P3 feature scope; `Removed` marks requirements dropped by team decision |
| Flow owner          | Member responsible for one actor flow end to end (UI + server actions)           |
| Implemented         | Only if repository/code/tests substantiate it                                    |
| Definition of done  | Integrated behavior, tests/docs and reviewed issue-linked PR evidence            |
