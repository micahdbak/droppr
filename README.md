# droppr

Droppr is a peer-to-peer file transfer service. Files are transferred
directly between the systems involved and are never stored server-side.

A public instance is hosted at [droppr.net](https://droppr.net).

## repository layout

- `server/`: Go backend; HTTP API and WebRTC signaling over WebSocket
- `webclient/`: React single-page frontend (Vite, Tailwind CSS)

## transfer flow

1. The dropper registers a file with the API and receives a six-character
   drop code, shareable as a link or QR code.
2. The receiver enters the code; both peers connect to the signaling
   WebSocket and negotiate a WebRTC peer connection.
3. The file streams directly between the peers over a WebRTC data channel.
4. When direct connectivity fails, ICE falls back to a TURN relay; the
   backend issues ephemeral TURN credentials to the dropper at register time
   (see [TURN relay](#turn-relay-optional)).

## server

### requirements

- Go 1.25 or newer
- PostgreSQL 13 or newer (the schema uses the built-in `gen_random_uuid()`)
- [eturnal](https://eturnal.net/) (optional, for TURN relay)

### HTTP routes

| Method | Path                 | Description                                        |
| ------ | -------------------- | -------------------------------------------------- |
| POST   | `/api/register`      | register a drop                                    |
| POST   | `/api/claim/{code}`  | claim a drop as the receiver                       |
| GET    | `/api/peek/{code}`   | peek at the file info for a drop                   |
| GET    | `/api/status`        | get the number of drops served                     |
| GET    | `/api/check`         | check whether the requester already has a session  |
| POST   | `/api/cleanup`       | clear the requester's session cookies              |
| GET    | `/sc`                | upgrade to a WebSocket for the signaling channel   |

### environment variables

| Variable      | Required | Description                                                          |
| ------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL`| yes      | PostgreSQL connection string                                         |
| `TURN_SECRET` | no       | shared secret for deriving ephemeral TURN credentials                |
| `TURN_URLS`   | no       | comma-separated list of `turn:` URLs issued to droppers              |

### setup

#### 1. install postgresql

Install the PostgreSQL client and server packages for your system (the exact
package names differ between distros; install both the server and the `psql`
client).

#### 2. enable and start postgresql

Enable the PostgreSQL service so it starts on boot, and start it now so it is
running for the rest of setup.

#### 3. create the database user and database

PostgreSQL creates a `postgres` superuser account by default. Drop into a
`psql` shell as that user:

```sh
sudo -u postgres psql
```

Then run the following SQL to create the `droppr` role (choose your own
password; the examples below use `1234`) and a database owned by it:

```sql
CREATE USER droppr WITH PASSWORD '1234';
CREATE DATABASE droppr OWNER droppr;
\c droppr
GRANT ALL PRIVILEGES ON DATABASE droppr TO droppr;
```

Exit with `\q`.

#### 4. create the schema

From the `server/` directory, load the schema:

```sh
psql -U droppr -d droppr -f schema.sql -h localhost -W
```

Enter the password you set when prompted. This creates the `drops` and
`sessions` tables, the `drop_role_enum` type, and the supporting indexes.

#### 5. enable password authentication (scram-sha-256)

By default, many PostgreSQL installations use `ident` authentication for local
TCP connections, which means `psql -U droppr -h localhost` will be rejected
even with the right password. To log in over the network with a password, edit
your `pg_hba.conf` (its location varies by distro; check your PostgreSQL
service's data directory) and change the authentication method from `ident`
to `scram-sha-256` for the host entries, e.g.:

```
# was:
# host  all  all  127.0.0.1/32  ident
# host  all  all  ::1/128       ident

host  all  all  127.0.0.1/32  scram-sha-256
host  all  all  ::1/128       scram-sha-256
```

Then reload PostgreSQL so the change takes effect:

```sh
sudo systemctl reload postgresql
```

You should now be able to connect with:

```sh
psql -U droppr -d droppr -h localhost -W
```

Likewise, the previous command to load the schema should work.

#### 6. run the server

```sh
DATABASE_URL=postgres://droppr:1234@localhost:5432/droppr go run .
```

The server listens on `:5050`. The webclient dev server proxies
`/api/*` and the `/sc` WebSocket to this address.

### TURN relay (optional)

When a direct P2P connection between peers is impossible, a TURN relay can be
used as a fallback. The relay is [eturnal](https://eturnal.net/). The backend
never relays traffic; it only issues credentials.

#### install eturnal

Install eturnal using the packages or build instructions at
[eturnal.net](https://eturnal.net/), then enable and start the service:

```sh
sudo systemctl enable --now eturnal
```

#### configure eturnal

Edit `/etc/eturnal.yml` and set `secret:` to the same value you will pass to
the server as `TURN_SECRET`:

```yaml
eturnal:
  secret: "long-and-cryptic"
```

The remaining defaults suffice: eturnal listens for STUN and TURN on port
`3478` (UDP and TCP) and relays from UDP ports `49152-65535`. Restart the
service:

```sh
sudo systemctl restart eturnal
```

#### issue credentials

Set both `TURN_SECRET` and `TURN_URLS` when running the server:

```sh
DATABASE_URL=postgres://droppr:1234@localhost:5432/droppr \
TURN_SECRET=long-and-cryptic \
TURN_URLS=turn:droppr.net:3478?transport=udp,turn:droppr.net:3478?transport=tcp \
go run .
```

`TURN_SECRET` must match `secret:` in `/etc/eturnal.yml`. The server derives
ephemeral credentials per the REST API for Access to TURN Services
specification (username is the Unix expiry timestamp; the credential is
`Base64(HMAC-SHA1(secret, username))`) and issues them to droppers at register
time. Credentials are valid for four hours. When either variable is unset, no
TURN credentials are issued and clients fall back to STUN/P2P only.

The webclient derives its STUN/TURN server from the hostname it is served
from (port `3478`); eturnal must therefore be reachable at the hostname
droppr is served from.

### testing

#### 1. create the test database

Create and initialize the test database once:

```sh
sudo -u postgres psql -c "CREATE DATABASE droppr_test OWNER droppr;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE droppr_test TO droppr;"
psql -U droppr -d droppr_test -f schema.sql -h localhost -W
```

#### 2. run tests

Run all tests across all packages:

```sh
DATABASE_URL="postgres://droppr:1234@localhost:5432/droppr_test" go test -v ./...
```

Run tests for a specific package:

```sh
# api tests
DATABASE_URL="postgres://droppr:1234@localhost:5432/droppr_test" go test -v ./api/...

# signaling tests
go test -v ./signaling/...
```

## webclient

### requirements

- [bun](https://bun.sh/)

### commands

Run all commands from the `webclient/` directory:

```sh
bun install          # install dependencies
bun run dev          # start the Vite dev server
bun run build        # production build to dist/
bun run preview      # preview the production build
bun run lint         # ESLint
bun run lint:fix     # ESLint with auto-fix
bun run format       # Prettier write
bun run format:check # Prettier check
```

### development

The dev server proxies `/api/*` and the `/sc` WebSocket to
`http://localhost:5050`, so the Go server must be running. It also binds to
all interfaces (`vite --host`), so other devices on the network can reach it;
useful for testing transfers between two devices.

## license

Distributed under the MIT license; see [LICENSE](LICENSE).
