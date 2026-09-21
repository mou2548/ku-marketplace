# Rollback notes

Before rolling back, resolve every ticket whose status is `Registered`,
`NotSelected`, or `Forfeited`; the former constraint cannot store those values
(a proven `Forfeited` record may be restored to the former `Waived` value).
Do not rewrite them automatically because that would recreate the ambiguity this
migration removes.

After the data has been resolved, drop
`Giveaway_Ticket_giveaway_id_receiver_id_key`, replace the ticket-status check with
the former `Waiting`, `Received`, `Expired`, and `Waived` set, and optionally remove
`Giveaway_Post.quantity` and `Giveaway_Post.register_deadline` only when the target
installation did not have those columns before this migration.
