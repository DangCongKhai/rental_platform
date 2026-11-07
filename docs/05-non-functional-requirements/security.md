# Security requirements

Follow the [security design](../07-architecture/security-design.md) and FR05, FR43, FR86 and FR88. Show that private records are isolated, input is validated on the server, non-owners and non-admins are refused, and contract decisions apply only to the exact version and hash. Server Actions' same-origin check protects writes against CSRF. Prevent XSS and injection, forged actors and public access to private contract files. Rate-limit report submission.
