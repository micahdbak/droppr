# droppr

## server

The server provides the following HTTP routes:

- `/api/register`, register a drop
- `/api/claim/:drop_id`, claim a drop
- `/sc`, upgrade a connection to WebSocket for a signal channel

### database

If starting a fresh database, simply run `psql -d droppr -f schema.sql`.
