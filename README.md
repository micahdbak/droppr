# droppr

Droppr is a peer to peer file transfer service that makes it easy to transfer
files between devices.
Files transferred through droppr are not stored in the cloud;
instead, data is transmitted directly between the systems involved.

Droppr is deployed live at [droppr.net](https://droppr.net).

## webclient

The web client for droppr is a React frontend that serves the droppr frontend.

## server

### HTTP routes

The server provides the following HTTP routes:

- `POST /api/register`, register a drop
- `POST /api/claim/{code}`, claim a drop
- `GET /api/peek/{code}`, peek at the file info for a drop
- `GET /api/status`, get the number of drops served
- `GET /api/check`, check whether the requester already has a session
- `POST /api/cleanup`, clear the requester's session cookies
- `GET /sc`, upgrade a connection to a WebSocket for a signaling channel

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
password - the examples below use `1234`) and a database owned by it:

```sql
CREATE USER droppr WITH PASSWORD '1234';
CREATE DATABASE droppr OWNER droppr;
\c droppr
GRANT ALL PRIVILEGES ON DATABASE droppr TO droppr;
```

Exit with `\q`.

#### 4. create the schema

With the database and user in place, load the schema:

```sh
psql -U droppr -d droppr -f schema.sql -h localhost -W
```

Enter the password you set when prompted. This creates the `drops` and
`sessions` tables, the `drop_role_enum` type, and the supporting indexes.
(On PostgreSQL 13 and newer, `gen_random_uuid()` is built in, so no
extensions are required.)

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

The server reads its database connection string from the `DATABASE_URL`
environment variable. Using the user/database/password created above:

```sh
DATABASE_URL=postgres://droppr:1234@localhost:5432/droppr go run .
```

The server listens on `:5050`. The webclient dev server proxies
`/api/*` and the `/sc` WebSocket to this address.

### testing

#### 1. create the test database

Run the following once to create and initialize the dedicated test database:

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
