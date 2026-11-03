# Open questions and decision boundaries

| Question                                                                                 | Owner       | Effect                                                                                              |
| ---------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Are the 48-hour hold and the unavailable-favourite placeholder/count semantics accepted? | Khai + Kien | Defaults are configurable; change docs and tests together if adjusted                               |
| Is lazy expiry/auto-rejection enough, or do we need Supabase Cron?                       | Khai        | Add a cron-triggered Route Handler only if holds must be released without anyone opening the record |
| Where will the app be hosted for the demo?                                               | Khai + Kien | Any standard Next.js host works because there is no worker                                          |
| What is Kien's GitHub handle?                                                            | Kien        | Needed before assigning issues                                                                      |
